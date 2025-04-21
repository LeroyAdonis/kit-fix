import { z } from "zod";

export const scheduleServiceSchema = z.object({
  name: z.string().min(1, "Full Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  suburb: z.string().min(1, "Suburb is required"),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province is required"),
  postalCode: z.string().min(4, "Postal code is required"),
  deliveryMethod: z.enum(["pickup", "dropoff"]),
  date: z
    .string()
    .min(1, "Date is required")
    .refine((val) => {
      const date = new Date(val);
      return date.toDateString() === val
        ? val
        : z.string().invalid("custom_error", {
            message: "Invalid date format. Should be dd MMM yyyy"
          });
    })
    .transform((val) => new Date(val)),
  deliveryDate: z
    .string()
    .min(1, "Delivery date is required")
    .transform((val) => new Date(val)),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms" })
  })
});

export type ScheduleServiceSchema = z.infer<typeof scheduleServiceSchema>;
