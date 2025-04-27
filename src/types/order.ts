// src/types/order.ts

import { Timestamp } from "firebase/firestore";

// Define core processing statuses - Added 'awaiting_fulfillment' and 'fulfilled'
export type OrderStatus =
  | "pending"
  | "in_progress"
  | "awaiting_fulfillment"
  | "fulfilled"
  | "completed"
  | "cancelled";

// Define overall repair/processing status within the workflow
export type RepairStatus =
  | "Pending Routing" // Initial state from customer form before admin acts
  | "Routed to Dropoff" // After admin routes a dropoff order
  | "Sent to Repair Manager" // After admin routes a pickup/delivery/standard order
  | "Ready for Repair (from Dropoff)" // After item is dropped off, before Repair Manager picks it up
  | "Assigned" // Assigned to a technician within Repair Manager
  | "In Repair" // Repair work is actively being done
  | "Repair Completed" // Repair work is finished
  | "Ready for Pickup" // Status set by Repair Manager before routing to Pickup Scheduler
  | "Ready for Delivery" // Status set by Repair Manager before routing to Delivery Manager
  | "Out for Delivery"; // Status set by Delivery Manager

export type DeliveryMethod = "pickup" | "delivery" | "dropoff";

// Define specific statuses for each method flow - Added scheduled/actual timestamps
export type DropoffStatus =
  | "pending"
  | "awaiting_dropoff"
  | "dropped_off"
  | "ready_for_repair";
export type PickupStatus =
  | "pending"
  | "awaiting_pickup"
  | "scheduled"
  | "picked"; // 'picked' is the final status for this flow
export type DeliveryStatus =
  | "pending"
  | "awaiting_delivery"
  | "scheduled"
  | "out_for_delivery"
  | "delivered"; // 'delivered' is the final status for this flow

export type PaymentStatus = "unpaid" | "paid" | "refunded";

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
  address?: string; // Address might be saved here, especially for delivery method
}

// Consolidated processing information
export interface ProcessingInfo {
  status: OrderStatus; // Main status: pending, in_progress, awaiting_fulfillment, fulfilled, completed, cancelled
  repairStatus: RepairStatus; // Detailed status within the workflow

  deliveryMethod: DeliveryMethod; // How the item gets to/from KitFix

  // Method-specific statuses (only one set will be relevant based on deliveryMethod)
  dropoffStatus?: DropoffStatus; // Status for dropoff flow
  pickupStatus?: PickupStatus; // Status for pickup flow
  deliveryStatus?: DeliveryStatus; // Status for delivery flow

  duration?: string; // Estimated repair duration from quote
  preferredDate?: string; // Customer's preferred date string from schedule form

  // Timestamps for key events (managed by admin actions)
  // repairStartTimestamp?: Timestamp; // Optional: When repair began
  // repairCompleteTimestamp?: Timestamp; // Optional: When repair finished

  // Dates related to specific methods, saved as Timestamps
  scheduledDropoffDate?: Timestamp; // Timestamp for when dropoff is scheduled/expected
  actualDropoffDate?: Timestamp; // Timestamp for when customer actually dropped off
  scheduledPickupDate?: Timestamp; // Timestamp for when pickup is scheduled/expected
  actualPickupDate?: Timestamp; // Timestamp for when customer actually picked up
  scheduledDeliveryDate?: Timestamp; // Timestamp for when delivery is scheduled/expected
  actualDeliveryDate?: Timestamp; // Timestamp for when delivery was completed
  // Maybe a 'readyForFulfillmentAt' timestamp set by RepairManager?
  readyForFulfillmentAt?: Timestamp;

  // Location/address fields related to methods (can be same as contactInfo.address)
  dropoffLocation?: string; // Address where customer drops off (e.g., Store Address)
  pickupLocation?: string; // Address where customer picks up (e.g., Store Address)
  // deliveryAddress is usually in contactInfo.address

  // Other processing fields
  repairManagerStatus?: string; // e.g., 'Assigned' (internal to Repair Manager)
  // Add any other processing fields as needed
}

export interface PaymentInfo {
  status: PaymentStatus; // e.g., 'unpaid', 'paid'
  amount: number; // Total amount, should be required
  method?: string;
  reference?: string;
  paidAt?: Timestamp;
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

  createdAt: Timestamp; // When the order was first created
  updatedAt: Timestamp; // When the order was last updated
  stepCompleted?: string; // Track customer journey step

  // Add other top-level order fields here
}
