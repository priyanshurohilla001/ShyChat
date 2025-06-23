import { z } from "zod";

export const YearSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const GenderSchema = z.union([z.literal("male"), z.literal("female")]);

export const IdentitySchema = z.object({
  gender: GenderSchema,
  year: YearSchema,
});

export const PreferencesSchema = z.object({
  gender: z.union([GenderSchema, z.literal("any")]),
  years: z.union([z.literal("any"), z.array(YearSchema)]),
});

export const JoinPayloadSchema = z.object({
  identity: IdentitySchema,
  preferences: PreferencesSchema,
});

// ─── Inferred TypeScript Types ───────────────────────────────
export type Year = z.infer<typeof YearSchema>;
export type Gender = z.infer<typeof GenderSchema>;
export type Identity = z.infer<typeof IdentitySchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type JoinPayload = z.infer<typeof JoinPayloadSchema>;

const lola = {
  identity: {
    gender: "male",
    year: 2,
  },
  preferences: {
    gender: "any",
    years: "any",
  },
};
