import { ageInMonths, formatAge } from '../../../platform/calendar/age.js';
import type { LocalDate } from '../../../platform/calendar/local-date.js';
import type { PetSex } from '../domain/pet.js';
import type { PetRow } from './ports.js';

/** Thú cưng sau use case; URL ảnh được ký ở presenter (adapters/http/pet-presenter.ts). */
export interface PetView {
  id: string;
  name: string;
  breed: string;
  sex: PetSex;
  birthDate: string;
  /** Tuổi tính ở server theo múi giờ tài khoản (US-011); client ghép câu theo ngôn ngữ (S4-08). */
  ageMonths: number;
  /** Câu tiếng Việt, giữ cho client cũ. */
  ageText: string;
  description: string | null;
  avatarKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toPetView(row: PetRow, today: LocalDate): PetView {
  const birth = row.birth_date as LocalDate;
  // Người dùng đổi sang múi giờ "chậm" hơn có thể khiến ngày sinh thành ngày mai: coi như 0 tháng.
  const ageMonths = ageInMonths(birth <= today ? birth : today, today);
  return {
    id: row.id,
    name: row.name,
    breed: row.breed,
    sex: row.sex as PetSex,
    birthDate: row.birth_date,
    ageMonths,
    ageText: formatAge(ageMonths),
    description: row.description,
    avatarKey: row.avatar_key,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
