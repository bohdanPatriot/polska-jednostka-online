import { z } from "zod";

// SECURITY: Centralized validation schemas for enum types

export const forumCategorySchema = z.enum(
  ['historia', 'sprzet', 'taktyka', 'aktualnosci', 'offtopic'],
  {
    errorMap: () => ({ message: "Nieprawidłowa kategoria forum" })
  }
);

export const userRankSchema = z.enum(
  ['rekrut', 'szeregowy', 'kapral', 'plutonowy', 'sierzant', 'podporucznik', 'porucznik', 'kapitan', 'major', 'podpulkownik', 'pulkownik', 'general'],
  {
    errorMap: () => ({ message: "Nieprawidłowa ranga użytkownika" })
  }
);

export const appRoleSchema = z.enum(['admin', 'moderator', 'user'], {
  errorMap: () => ({ message: "Nieprawidłowa rola" })
});

export type ForumCategory = z.infer<typeof forumCategorySchema>;
export type UserRank = z.infer<typeof userRankSchema>;
export type AppRole = z.infer<typeof appRoleSchema>;
