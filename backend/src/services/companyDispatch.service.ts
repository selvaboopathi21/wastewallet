// Company Dispatch Service: Handles store staff scrap handover, tie-up company requirements, reception & notifications
import { Types } from 'mongoose';
import CompanyDispatch from '../models/CompanyDispatch';
import StaffNotification from '../models/StaffNotification';
import Buyer from '../models/Buyer';
import SortedMaterial from '../models/SortedMaterial';
import Batch from '../models/Batch';
import User from '../models/User';
import ApiError from '../utils/ApiError';
import logger from '../utils/logger';
import { ScrapCategory } from '../types';
import { SCRAP_CATEGORIES } from '../utils/constants';
import { emitCompanyDispatchCreated, emitCompanyDispatchReceived } from '../sockets';

export interface IDispatchInput {
  companyId: string;
  materialType: ScrapCategory;
  weightKg: number;
  vehicleNumber?: string;
  dispatchNotes?: string;
  batchId?: string;
}

export interface IReceiveInput {
  receivedWeightKg?: number;
  receivedNotes?: string;
}

/**
 * 1. Get real-time warehouse inventory breakdown by category
 * Shows: Available kg in store stock, total sorted kg, total dispatched kg, total received by companies
 */
export const getWarehouseInventory = async () => {
  // Aggregate sorted materials that are currently in-stock (status: 'sorted')
  const inStockAgg = await SortedMaterial.aggregate([
    { $match: { status: 'sorted' } },
    {
      $group: {
        _id: '$materialType',
        availableKg: { $sum: '$weightKg' },
        itemCount: { $sum: 1 },
      },
    },
  ]);

  // Aggregate total lifetime sorted materials by category
  const sortedAgg = await SortedMaterial.aggregate([
    {
      $group: {
        _id: '$materialType',
        totalSortedKg: { $sum: '$weightKg' },
        sortedCount: { $sum: 1 },
      },
    },
  ]);

  // Aggregate company dispatches by category
  const dispatchAgg = await CompanyDispatch.aggregate([
    {
      $group: {
        _id: '$materialType',
        totalDispatchedKg: { $sum: '$weightKg' },
        totalReceivedKg: {
          $sum: {
            $cond: [{ $eq: ['$status', 'received'] }, { $ifNull: ['$receivedWeightKg', '$weightKg'] }, 0],
          },
        },
        activeDispatchedKg: {
          $sum: {
            $cond: [{ $eq: ['$status', 'dispatched'] }, '$weightKg', 0],
          },
        },
        dispatchCount: { $sum: 1 },
      },
    },
  ]);

  const inStockMap = new Map<string, number>();
  inStockAgg.forEach((item) => inStockMap.set(item._id, item.availableKg));

  const sortedMap = new Map<string, number>();
  sortedAgg.forEach((item) => sortedMap.set(item._id, item.totalSortedKg));

  const dispatchMap = new Map<string, any>();
  dispatchAgg.forEach((item) => dispatchMap.set(item._id, item));

  // Category metadata for UI
  const categoryMetadata: Record<string, { label: string; icon: string; defaultBuyer: string; specialHandling: boolean }> = {
    iron: { label: 'Scrap Iron & Structural Steel', icon: '🔩', defaultBuyer: 'Chennai Metal Recyclers Ltd', specialHandling: false },
    plastic: { label: 'Rigid & Flexible Plastics', icon: '🧴', defaultBuyer: 'Tamil Nadu Plastic Processing Plant', specialHandling: false },
    ewaste: { label: 'Electronic PCBs & Components', icon: '💻', defaultBuyer: 'Eco-Green E-Waste Recyclers', specialHandling: true },
    copper_wire: { label: 'Heavy Copper Wire & Armatures', icon: '🔌', defaultBuyer: 'Apex Copper Recovery Unit', specialHandling: false },
    battery: { label: 'Lead-Acid & Inverter Batteries', icon: '🔋', defaultBuyer: 'VoltPower Battery Safe Recovery', specialHandling: true },
    paper: { label: 'Cardboard & Mixed Paper Pulp', icon: '📰', defaultBuyer: 'South Paper Mill Reclaimers', specialHandling: false },
    other: { label: 'Other Miscellaneous Scrap', icon: '📦', defaultBuyer: 'Chennai Metal Recyclers Ltd', specialHandling: false },
    mixed: { label: 'Mixed Unsorted Scrap Bags', icon: '♻️', defaultBuyer: 'Tamil Nadu Plastic Processing Plant', specialHandling: false },
  };

  const inventory = SCRAP_CATEGORIES.map((cat) => {
    const totalSorted = sortedMap.get(cat) || 0;
    const availableKg = Number((inStockMap.get(cat) || 0).toFixed(1));
    const dispInfo = dispatchMap.get(cat) || { totalDispatchedKg: 0, totalReceivedKg: 0, activeDispatchedKg: 0 };

    return {
      category: cat,
      label: categoryMetadata[cat]?.label || cat,
      icon: categoryMetadata[cat]?.icon || '♻️',
      specialHandling: categoryMetadata[cat]?.specialHandling || false,
      defaultBuyer: categoryMetadata[cat]?.defaultBuyer || 'Licensed Recycler',
      availableKg,
      totalSortedKg: Number(totalSorted.toFixed(1)),
      totalDispatchedKg: Number(dispInfo.totalDispatchedKg.toFixed(1)),
      totalReceivedKg: Number(dispInfo.totalReceivedKg.toFixed(1)),
      activeInTransitKg: Number(dispInfo.activeDispatchedKg.toFixed(1)),
    };
  });

  const totalAvailableKg = inventory.reduce((sum, item) => sum + item.availableKg, 0);
  const totalSortedAllKg = inventory.reduce((sum, item) => sum + item.totalSortedKg, 0);
  const totalDispatchedAllKg = inventory.reduce((sum, item) => sum + item.totalDispatchedKg, 0);
  const totalReceivedAllKg = inventory.reduce((sum, item) => sum + item.totalReceivedKg, 0);

  // Fetch recent sorted batches with their itemized SortedMaterials
  const recentSortedBatchesDocs = await Batch.find({ status: 'sorted' })
    .sort({ sortedAt: -1, createdAt: -1 })
    .limit(10)
    .populate('collectorId', 'name phone')
    .populate('receivedBy', 'name phone')
    .lean();

  const batchIds = recentSortedBatchesDocs.map((b) => b._id);
  const allBatchMaterials = await SortedMaterial.find({ batchId: { $in: batchIds } })
    .populate('destinationBuyerId', 'name acceptedMaterials')
    .lean();

  const materialsByBatch = new Map<string, any[]>();
  allBatchMaterials.forEach((m) => {
    const bId = m.batchId.toString();
    if (!materialsByBatch.has(bId)) materialsByBatch.set(bId, []);
    materialsByBatch.get(bId)!.push(m);
  });

  const recentSortedBatches = recentSortedBatchesDocs.map((b) => ({
    _id: b._id,
    qrCode: b.qrCode,
    collectorName: (b.collectorId as any)?.name || 'Collector Partner',
    depositedWeightKg: b.depositedWeightKg,
    receivedWeightKg: b.receivedWeightKg,
    lossPercent: b.lossPercent,
    sortedAt: b.sortedAt || b.updatedAt,
    materials: (materialsByBatch.get(b._id.toString()) || []).map((m: any) => ({
      _id: m._id,
      materialType: m.materialType,
      weightKg: m.weightKg,
      status: m.status,
      isSpecialHandling: m.isSpecialHandling,
      buyerName: m.destinationBuyerId?.name || null,
    })),
  })).filter((b) => b.materials.length > 0);

  return {
    summary: {
      totalAvailableKg: Number(totalAvailableKg.toFixed(1)),
      totalSortedKg: Number(totalSortedAllKg.toFixed(1)),
      totalDispatchedKg: Number(totalDispatchedAllKg.toFixed(1)),
      totalReceivedKg: Number(totalReceivedAllKg.toFixed(1)),
    },
    inventory,
    recentSortedBatches,
  };
};

/**
 * 2. Get list of all Tie-Up Partner Companies with requirement matching
 */
export const getTieUpCompanies = async (categoryFilter?: string) => {
  const query: any = { isActive: true };
  if (categoryFilter && categoryFilter !== 'all') {
    query.acceptedMaterials = categoryFilter;
  }

  let buyers = await Buyer.find(query).sort({ name: 1 });

  // Auto-seed default partner recycling companies if database collection is empty
  if (buyers.length === 0) {
    const defaultBuyers = [
      {
        name: 'Chennai Metal Recyclers Ltd',
        acceptedMaterials: ['iron', 'other'],
        contact: { phone: '9444011111', person: 'Murugesan' },
        location: 'Ambattur Industrial Estate, Chennai',
        isActive: true,
      },
      {
        name: 'Tamil Nadu Plastic Processing Plant',
        acceptedMaterials: ['plastic', 'mixed'],
        contact: { phone: '9444022222', person: 'Kavitha' },
        location: 'Guindy Industrial Estate, Chennai',
        isActive: true,
      },
      {
        name: 'Apex Copper Recovery Unit',
        acceptedMaterials: ['copper_wire'],
        contact: { phone: '9444033333', person: 'Suresh' },
        location: 'Sriperumbudur, Tamil Nadu',
        isActive: true,
      },
      {
        name: 'Eco-Green E-Waste Recyclers',
        acceptedMaterials: ['ewaste'],
        contact: { phone: '9444044444', person: 'Venkatesh' },
        location: 'Maraimalai Nagar, Chennai',
        isActive: true,
      },
      {
        name: 'VoltPower Battery Safe Recovery',
        acceptedMaterials: ['battery'],
        contact: { phone: '9444055555', person: 'Radha' },
        location: 'Gummidipoondi, Tamil Nadu',
        isActive: true,
      },
      {
        name: 'South Paper Mill Reclaimers',
        acceptedMaterials: ['paper'],
        contact: { phone: '9444066666', person: 'Manikandan' },
        location: 'Madhavaram, Chennai',
        isActive: true,
      },
    ];
    for (const b of defaultBuyers) {
      await Buyer.findOneAndUpdate({ name: b.name }, b, { upsert: true, new: true, setDefaultsOnInsert: true });
    }
    buyers = await Buyer.find(query).sort({ name: 1 });
  }

  // Fetch metrics for each company from CompanyDispatch
  const companiesWithStats = await Promise.all(
    buyers.map(async (buyer) => {
      const dispatches = await CompanyDispatch.find({ companyId: buyer._id });
      const totalDispatches = dispatches.length;
      const activeInTransit = dispatches.filter((d) => d.status === 'dispatched').length;
      const completedReceived = dispatches.filter((d) => d.status === 'received');
      const totalReceivedKg = completedReceived.reduce((sum, d) => sum + (d.receivedWeightKg || d.weightKg || 0), 0);

      return {
        _id: buyer._id,
        id: buyer._id,
        name: buyer.name,
        acceptedMaterials: buyer.acceptedMaterials,
        location: buyer.location,
        contact: buyer.contact,
        isActive: buyer.isActive,
        stats: {
          totalDispatches,
          activeInTransit,
          completedReceivedCount: completedReceived.length,
          totalReceivedKg: Number(totalReceivedKg.toFixed(1)),
        },
      };
    })
  );

  return companiesWithStats;
};

/**
 * 3. Store Staff dispatches / handovers separated scrap to a specific tie-up company
 */
export const dispatchToCompany = async (staffId: string, data: IDispatchInput) => {
  const { companyId, materialType, weightKg, vehicleNumber, dispatchNotes, batchId } = data;

  if (!companyId) {
    throw new ApiError(400, 'Destination tie-up company ID is required');
  }
  if (!materialType) {
    throw new ApiError(400, 'Material type category is required');
  }
  if (!weightKg || typeof weightKg !== 'number' || weightKg <= 0) {
    throw new ApiError(400, 'Valid dispatch weight in kg is required (must be greater than 0)');
  }

  // Verify company exists
  const buyer = await Buyer.findById(companyId);
  if (!buyer) {
    throw new ApiError(404, 'Tie-up company not found');
  }

  // Verify that company accepts this category
  if (!buyer.acceptedMaterials.includes(materialType)) {
    throw new ApiError(
      400,
      `Company "${buyer.name}" does not accept "${materialType}". They only accept: ${buyer.acceptedMaterials.join(', ')}.`
    );
  }

  // Verify real warehouse stock is sufficient for dispatch
  const currentInventory = await getWarehouseInventory();
  const catStock = currentInventory.inventory.find((i) => i.category === materialType);
  const availableKg = catStock ? catStock.availableKg : 0;
  if (weightKg > availableKg) {
    throw new ApiError(
      400,
      `Insufficient real stock for ${materialType.toUpperCase()}. Currently available: ${availableKg} kg, requested: ${weightKg} kg. Please separate collector batches to replenish stock.`
    );
  }

  // Ensure staffId is a valid User
  let validStaffId = staffId;
  const staffUser = await User.findById(staffId);
  if (!staffUser) {
    const defaultStaff = await User.findOne({ role: { $in: ['store_staff', 'admin'] } });
    if (defaultStaff) {
      validStaffId = defaultStaff._id.toString();
    }
  }

  // Generate unique human-readable dispatch code: e.g. WW-DISP-M2X8-4291
  const dispatchCode = `WW-DISP-${Date.now().toString(36).toUpperCase().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;

  const dispatch = await CompanyDispatch.create({
    dispatchCode,
    storeStaffId: new Types.ObjectId(validStaffId),
    companyId: buyer._id,
    companyName: buyer.name,
    materialType,
    weightKg: Number(weightKg.toFixed(2)),
    vehicleNumber: vehicleNumber?.trim() || '',
    dispatchNotes: dispatchNotes?.trim() || '',
    batchId: batchId ? new Types.ObjectId(batchId) : null,
    status: 'dispatched',
    dispatchedAt: new Date(),
  });

  // Deduct dispatched weight from SortedMaterials in stock (status: 'sorted')
  let remainingToDeduct = weightKg;
  const matchFilter: any = { materialType, status: 'sorted' };
  if (batchId) {
    matchFilter.batchId = new Types.ObjectId(batchId);
  }

  const sortedDocs = await SortedMaterial.find(matchFilter).sort({ createdAt: 1 });
  for (const doc of sortedDocs) {
    if (remainingToDeduct <= 0) break;
    if (doc.weightKg <= remainingToDeduct + 0.001) {
      remainingToDeduct -= doc.weightKg;
      doc.status = 'dispatched';
      doc.destinationBuyerId = buyer._id;
      await doc.save();
    } else {
      // Split doc: dispatched portion becomes 'dispatched', remainder stays 'sorted'
      const dispatchedPart = Number(remainingToDeduct.toFixed(2));
      const remainingPart = Number((doc.weightKg - dispatchedPart).toFixed(2));
      doc.weightKg = remainingPart;
      await doc.save();

      await SortedMaterial.create({
        batchId: doc.batchId,
        materialType: doc.materialType,
        weightKg: dispatchedPart,
        isSpecialHandling: doc.isSpecialHandling,
        isDamaged: doc.isDamaged,
        destinationBuyerId: buyer._id,
        status: 'dispatched',
      });
      remainingToDeduct = 0;
      break;
    }
  }

  const populatedDispatch = await CompanyDispatch.findById(dispatch._id)
    .populate('storeStaffId', 'name phone')
    .populate('companyId', 'name contact location acceptedMaterials');

  logger.info(
    `🚚 Store staff dispatched consignment ${dispatch.dispatchCode}: ${weightKg}kg ${materialType} ➔ Company "${buyer.name}"`
  );

  // Emit socket event to company and store staff
  emitCompanyDispatchCreated(populatedDispatch || dispatch);

  return populatedDispatch || dispatch;
};

/**
 * 4. Get Company Portal Dashboard: View incoming and historical consignments for this company
 */
export const getCompanyPortal = async (companyIdOrName: string) => {
  let buyer = null;

  if (Types.ObjectId.isValid(companyIdOrName)) {
    buyer = await Buyer.findById(companyIdOrName);
  }

  if (!buyer) {
    buyer = await Buyer.findOne({
      $or: [
        { name: { $regex: new RegExp(companyIdOrName.trim(), 'i') } },
        { 'contact.phone': companyIdOrName.trim() },
      ],
    });
  }

  // Fallback: If not found, return the first active buyer
  if (!buyer) {
    buyer = await Buyer.findOne({ isActive: true });
  }

  if (!buyer) {
    throw new ApiError(404, 'Tie-up company not found');
  }

  // Pending incoming dispatches awaiting receipt
  const pendingDispatches = await CompanyDispatch.find({
    companyId: buyer._id,
    status: 'dispatched',
  })
    .populate('storeStaffId', 'name phone')
    .sort({ dispatchedAt: -1 });

  // Historical received dispatches
  const receivedHistory = await CompanyDispatch.find({
    companyId: buyer._id,
    status: 'received',
  })
    .populate('storeStaffId', 'name phone')
    .sort({ receivedAt: -1 });

  // Calculate metrics
  const totalReceivedKg = receivedHistory.reduce((sum, d) => sum + (d.receivedWeightKg || d.weightKg || 0), 0);
  const pendingWeightKg = pendingDispatches.reduce((sum, d) => sum + (d.weightKg || 0), 0);

  return {
    company: buyer,
    pendingDispatches,
    receivedHistory,
    metrics: {
      pendingCount: pendingDispatches.length,
      pendingWeightKg: Number(pendingWeightKg.toFixed(1)),
      receivedCount: receivedHistory.length,
      totalReceivedKg: Number(totalReceivedKg.toFixed(1)),
    },
  };
};

/**
 * 5. Tie-Up Company marks a consignment as "Received"
 * Creates receipt message and sends notification back to store staff!
 */
export const receiveCompanyDispatch = async (
  dispatchIdOrCode: string,
  data?: IReceiveInput
) => {
  const query = Types.ObjectId.isValid(dispatchIdOrCode)
    ? { _id: dispatchIdOrCode }
    : { dispatchCode: dispatchIdOrCode };

  const dispatch = await CompanyDispatch.findOne(query)
    .populate('storeStaffId', 'name phone')
    .populate('companyId', 'name contact location acceptedMaterials');

  if (!dispatch) {
    throw new ApiError(404, `Consignment dispatch "${dispatchIdOrCode}" not found`);
  }

  if (dispatch.status === 'received') {
    throw new ApiError(400, `Consignment ${dispatch.dispatchCode} has already been marked as received.`);
  }

  const receivedWeightKg =
    data?.receivedWeightKg !== undefined && data?.receivedWeightKg !== null
      ? Number(Number(data.receivedWeightKg).toFixed(2))
      : dispatch.weightKg;

  const receivedNotes = data?.receivedNotes?.trim() || 'Scrap material received and verified at gate scale';

  const categoryName = dispatch.materialType.replace('_', ' ').toUpperCase();
  const receiptMessage = `✅ [${dispatch.companyName}] confirmed receipt of ${receivedWeightKg} kg ${categoryName}! Consignment #${dispatch.dispatchCode}. Note: "${receivedNotes}"`;

  // Update dispatch record
  dispatch.status = 'received';
  dispatch.receivedWeightKg = receivedWeightKg;
  dispatch.receivedAt = new Date();
  dispatch.receivedNotes = receivedNotes;
  dispatch.receiptMessage = receiptMessage;
  await dispatch.save();

  // Create persistent Staff Notification
  const notification = await StaffNotification.create({
    type: 'company_receipt',
    title: `Receipt Confirmed: ${dispatch.companyName}`,
    message: receiptMessage,
    companyId: dispatch.companyId,
    companyName: dispatch.companyName,
    dispatchId: dispatch._id,
    materialType: dispatch.materialType,
    weightKg: receivedWeightKg,
    isRead: false,
  });

  // Update linked sorted materials to 'delivered'
  if (dispatch.batchId) {
    await SortedMaterial.updateMany(
      { batchId: dispatch.batchId, materialType: dispatch.materialType },
      { status: 'delivered' }
    );
  }

  logger.info(
    `🏢 Tie-up Company "${dispatch.companyName}" received consignment ${dispatch.dispatchCode}: ${receivedWeightKg} kg ${dispatch.materialType}. Notified staff!`
  );

  // Emit real-time socket event back to Store Staff!
  emitCompanyDispatchReceived(dispatch, notification);

  return {
    dispatch,
    notification,
    message: receiptMessage,
  };
};

/**
 * 6. Get Staff In-App Notifications and Receipt Messages
 */
export const getStaffNotifications = async () => {
  const notifications = await StaffNotification.find()
    .sort({ createdAt: -1 })
    .limit(40);

  const unreadCount = await StaffNotification.countDocuments({ isRead: false });

  return {
    notifications,
    unreadCount,
  };
};

/**
 * 7. Mark staff notifications as read
 */
export const markNotificationsAsRead = async (notificationId?: string) => {
  if (notificationId && notificationId !== 'all') {
    await StaffNotification.findByIdAndUpdate(notificationId, { isRead: true });
  } else {
    await StaffNotification.updateMany({ isRead: false }, { isRead: true });
  }

  return { success: true };
};

/**
 * 8. List all dispatches with filtering
 */
export const listDispatches = async (filters: {
  status?: string;
  companyId?: string;
  materialType?: string;
}) => {
  const query: any = {};
  if (filters.status) query.status = filters.status;
  if (filters.companyId) query.companyId = new Types.ObjectId(filters.companyId);
  if (filters.materialType) query.materialType = filters.materialType;

  return await CompanyDispatch.find(query)
    .populate('storeStaffId', 'name phone')
    .populate('companyId', 'name contact location acceptedMaterials')
    .sort({ dispatchedAt: -1 });
};

export default {
  getWarehouseInventory,
  getTieUpCompanies,
  dispatchToCompany,
  getCompanyPortal,
  receiveCompanyDispatch,
  getStaffNotifications,
  markNotificationsAsRead,
  listDispatches,
};
