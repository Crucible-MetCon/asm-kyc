import { z } from 'zod';

export const GenderEnum = z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']);
export type Gender = z.infer<typeof GenderEnum>;

export const LanguageEnum = z.enum(['en', 'bem']);
export type Language = z.infer<typeof LanguageEnum>;

// Step 1: Personal Details
export const ProfileStep1Schema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(200),
  nrc_number: z
    .string()
    .min(5, 'NRC number is required')
    .max(30)
    .regex(/^\d{6}\/\d{2}\/\d$/, 'NRC format: 123456/12/1'),
  date_of_birth: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  gender: GenderEnum,
});
export type ProfileStep1 = z.infer<typeof ProfileStep1Schema>;

// Step 2: Mining Details
export const ProfileStep2Schema = z.object({
  mine_site_name: z.string().min(1, 'Mine site name is required').max(200),
  mine_site_location: z.string().min(1, 'Location is required').max(500),
  mining_license_number: z.string().max(100).optional().or(z.literal('')),
});
export type ProfileStep2 = z.infer<typeof ProfileStep2Schema>;

// Combined profile update (sent to API)
export const ProfileUpdateSchema = ProfileStep1Schema.merge(ProfileStep2Schema);
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;

// Consent acceptance
export const ConsentAcceptSchema = z.object({
  consent_version: z.string().min(1, 'Version is required'),
});
export type ConsentAccept = z.infer<typeof ConsentAcceptSchema>;

// Language preference update
export const LanguageUpdateSchema = z.object({
  home_language: LanguageEnum,
});
export type LanguageUpdate = z.infer<typeof LanguageUpdateSchema>;
