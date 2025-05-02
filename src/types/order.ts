// src/types/order.ts

import { Timestamp, FieldValue } from "firebase/firestore";

// Define core processing statuses
export type OrderStatus =
  | "pending" // OrdersTable
  | "in_progress" // Initial pickup/dropoff, RepairManager
  | "awaiting_fulfillment" // Waiting in PickupScheduler or DeliveryManager
  | "fulfilled" // Completed pickup or delivery
  | "completed" // Final internal complete status? Maybe fulfilled IS completed. Let's stick to fulfilled.
  | "cancelled"; // Cancelled at any stage

// Define overall repair/processing status within the workflow - Refined statuses
export type RepairStatus =
  | "Pending Routing" // Initial state from customer form before admin acts (OrdersTable)
  | "Routed to Dropoff" // After admin routes a customer dropoff order (OrdersTable)
  | "Routed for Pickup (KitFix)" // After admin routes a KitFix pickup order (OrdersTable)
  | "Item Dropped Off" // Set by DropoffManager (Initial phase)
  | "Item Picked Up (KitFix)" // Set by PickupScheduler (Initial phase)
  | "Scheduled for Pickup (KitFix)" // Set by PickupScheduler (Initial phase) - Signals ready for RepairManager
  | "Sent to Repair Manager" // Set by DropoffManager (Initial phase) - Signals ready for RepairManager
  | "Ready for Repair (from Dropoff)" // Set by DropoffManager (Initial phase) - Signals ready for RepairManager
  | "Ready for Repair (from Pickup)" // Set by PickupScheduler (Initial phase) - Signals ready for RepairManager
  | "Assigned" // Set by RepairManager
  | "In Repair" // Set by RepairManager
  | "Repair Completed" // Set by RepairManager
  | "Ready for Customer Pickup" // Set by RepairManager (Fulfillment phase) - Signals ready for DropoffManager
  | "Ready for KitFix Delivery" // Set by RepairManager (Fulfillment phase) - Signals ready for DeliveryManager
  | "Scheduled for Pickup (Customer)" // Set by DropoffManager (Fulfillment phase)
  | "Scheduled for Delivery (KitFix)" // Set by DeliveryManager (Fulfillment phase)
  | "Out for Delivery" // Set by DeliveryManager (Fulfillment phase)
  | "Picked Up by Customer" // Set by DropoffManager (Fulfillment phase)
  | "Delivered to Customer"; // Set by DeliveryManager (Fulfillment phase)

export type InitialMethod = "pickup" | "dropoff"; // How it gets TO KitFix
export type FulfillmentMethod = "pickup" | "delivery"; // How it gets BACK to customer

export type PaymentStatus = "unpaid" | "paid" | "refunded";

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
  address?: string; // Customer's address - used for delivery fulfillment or potentially pickup from customer
}

// Consolidated processing information
export interface ProcessingInfo {
  actualPickupDate: Timestamp;
  pickupStatus: string;
  actualDeliveryDate: Timestamp;
  deliveryStatus: string;
  actualDropoffDate: Timestamp;
  dropoffStatus: string;
  deliveryMethod: string; // e.g., "FedEx", "UPS", "DHL" - used for delivery fulfillment
  scheduledDropoffDate: Timestamp;
  scheduledPickupDate: Timestamp;
  scheduledDeliveryDate: Timestamp;
  dropoffLocation: string; // Address where customer drops off (e.g., Store Address)
  pickupLocation: string; // Address where KitFix picks up (likely same as contactInfo.address) - Redundant with contactInfo.address if we save there. Let's rely on contactInfo.address for KitFix pickup.
  status: OrderStatus; // Main status: pending, in_progress, awaiting_fulfillment, fulfilled, cancelled
  repairStatus: RepairStatus; // Detailed status within the workflow
  deliveryAddress?: string;

  initialMethod: InitialMethod; // How it gets TO KitFix
  fulfillmentMethod: FulfillmentMethod; // How it gets BACK to customer

  duration?: string; // Estimated repair duration from quote
  preferredDate?: string; // Customer's preferred date string from schedule form (can be date for dropoff, pickup, or delivery)

  // Timestamps for key events (managed by admin actions)
  readyForFulfillmentAt?: Timestamp; // Timestamp when RepairManager marks repair completed and routes

  // Dates related to specific steps (Timestamps)
  scheduledInitialPickupDate?: Timestamp; // KitFix pickup from customer scheduled
  actualInitialPickupDate?: Timestamp; // KitFix picked up from customer
  scheduledCustomerDropoffDate?: Timestamp; // Customer dropoff scheduled/expected (maybe redundant with preferredDate string)
  actualCustomerDropoffDate?: Timestamp; // Customer actually dropped off

  scheduledCustomerPickupDate?: Timestamp; // Customer pickup from KitFix scheduled
  actualCustomerPickupDate?: Timestamp; // Customer actually picked up from KitFix

  scheduledKitFixDeliveryDate?: Timestamp; // KitFix delivery to customer scheduled
  actualKitFixDeliveryDate?: Timestamp; // KitFix delivered to customer

  // Location/address fields related to methods (can be same as contactInfo.address)
  // Let's make these optional strings, not necessarily requiring a Placeholder value saved.
  customerDropoffLocation?: string; // Address where customer drops off (e.g., Store Address)
  initialPickupLocation?: string; // Address where KitFix picks up (likely same as contactInfo.address) - Redundant with contactInfo.address if we save there. Let's rely on contactInfo.address for KitFix pickup.
  customerPickupLocation?: string; // Address where customer picks up (e.g., Store Address)
  kitFixDeliveryAddress?: string; // Address where KitFix delivers (likely same as contactInfo.address) - Redundant with contactInfo.address if we save there. Let's rely on contactInfo.address for KitFix delivery.

  // Internal Repair Manager status (optional)
  assignedTo?: string; // Technician ID/Name
  repairStartTime?: Timestamp;
  repairCompletionTime?: Timestamp;

  // Removed redundant location fields based on standardizing address in contactInfo
  // Remove redundant sub-status fields if not strictly necessary and repairStatus is sufficient.
  // We'll keep the simplified approach using only repairStatus and main status for filtering/actions.
}

export interface PaymentInfo {
  status: PaymentStatus; // e.g., 'unpaid', 'paid'
  amount: number; // Total amount, should be required
  method?: string;
  reference?: string;
  paidAt?: Timestamp | FieldValue; // Timestamp when payment was made
}

export interface Order {
  id: string; // Firestore document ID
  userId: string; // User who placed the order

  contactInfo: ContactInfo; // Contact details

  repairType: string; // e.g., "Basic", "Premium" - ID from GetQuote options
  repairDescription?: string; // Full description from Quote
  price: number; // Price from Quote

  notes?: string; // Additional notes from Quote

  photos?: string[]; // Array of photo URLs

  processing: ProcessingInfo; // Workflow state

  payment: PaymentInfo; // Payment state
  readyForFulfillmentAt?: Timestamp;

  createdAt: Timestamp | FieldValue; // When the order was first created
  updatedAt: Timestamp | FieldValue; // When the order was last updated
  stepCompleted?: string; // Track customer journey step

  // Add other top-level order fields here
}
