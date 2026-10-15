import { z } from "zod";

/** Mismas reglas que `app/schemas.py::_Credentials` en el backend. */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Mínimo 3 caracteres")
  .max(50, "Máximo 50 caracteres")
  .regex(/^[a-zA-Z0-9_.-]+$/, "Solo letras, números, punto, guion y guion bajo");

export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(72, "Máximo 72 caracteres")
  .regex(/[A-Za-z]/, "Debe incluir al menos una letra")
  .regex(/\d/, "Debe incluir al menos un número");

export const USERNAME_HINT = "Entre 3 y 50 caracteres: letras, números, punto, guion o guion bajo.";
export const PASSWORD_HINT = "Mínimo 8 caracteres, con al menos una letra y un número.";
