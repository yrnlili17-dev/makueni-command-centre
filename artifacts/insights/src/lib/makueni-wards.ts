// Makueni County: 6 constituencies, 30 wards (IEBC 2022 register, county 017).
// Mirrors artifacts/api-server/src/data/makueni-geography.ts.
export const MAKUENI_GEOGRAPHY = [
  { constituency: "Mbooni", wards: ["Tulimani", "Mbooni", "Kithungo/Kitundu", "Kiteta/Kisau", "Kako/Waia", "Kalawa"] },
  { constituency: "Kilome", wards: ["Kiima Kiu/Kalanzoni", "Mukaa", "Kasikeu"] },
  { constituency: "Kaiti", wards: ["Kee", "Kilungu", "Ilima", "Ukia"] },
  { constituency: "Makueni", wards: ["Nzaui/Kilili/Kalamba", "Muvau/Kikumini", "Kathonzweni", "Mavindini", "Kitise/Kithuki", "Wote", "Mbitini"] },
  { constituency: "Kibwezi West", wards: ["Makindu", "Kikumbulyu North", "Kikumbulyu South", "Nguumo", "Nguu/Masumba", "Emali/Mulala"] },
  { constituency: "Kibwezi East", wards: ["Masongaleni", "Mtito Andei", "Thange", "Ivingoni/Nzambani"] },
] as const;

export const MAKUENI_WARDS: string[] = MAKUENI_GEOGRAPHY.flatMap(({ wards }) => [...wards]);
