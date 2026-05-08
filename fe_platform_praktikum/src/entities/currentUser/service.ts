import type { CurrentUser } from "./types";

export async function fetchCurrentUser(): Promise<CurrentUser> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: "mhs-1",
        fullname: "Dwiky Juniardi",
        email: "dwiky@email.com",
        role: "MAHASISWA",
        avatarUrl: "https://i.pravatar.cc/150?img=12",

        studentProfile: {
          nim: "3202316001",
          programStudi: "Teknik Informatika",
          jurusan: "Teknik Elektro",
          angkatan: 2023,
          semester: 5,
          status: "Aktif",
        },

        personalData: {
          phone: "08123456789",
          birthPlace: "Sintang",
          birthDate: "23 Juni 2005",
          gender: "Laki-laki",
          city: "Pontianak",
        },
      });
    }, 500);
  });
}
