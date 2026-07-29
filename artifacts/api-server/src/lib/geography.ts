export const MAKUENI_GEOGRAPHY = {
  county: "Makueni",
  constituencies: {
    Mbooni: ["Tulimani", "Mbooni", "Kithungo/Kitundu", "Kiteta/Kisau", "Waia/Kako", "Kalawa"],
    Kilome: ["Kasikeu", "Mukaa", "Kiima Kiu/Kalanzoni"],
    Kaiti: ["Ukia", "Kee", "Kilungu", "Ilima"],
    Makueni: ["Wote/Nziu", "Muvau/Kikumini", "Mavindini", "Kitise/Kithuki", "Kathonzweni", "Nzaui/Kilili/Kalamba", "Mbitini"],
    "Kibwezi West": ["Makindu", "Nguumo", "Kikumbulyu North", "Kikumbulyu South", "Nguu/Masumba", "Emali/Mulala"],
    "Kibwezi East": ["Masongaleni", "Mtito Andei", "Thange", "Ivingoni/Nzambani"],
  },
} as const;

export const MAKUENI_CONSTITUENCIES = Object.keys(MAKUENI_GEOGRAPHY.constituencies);
export const MAKUENI_WARDS = Object.values(MAKUENI_GEOGRAPHY.constituencies).flat();
export type MakueniConstituency = keyof typeof MAKUENI_GEOGRAPHY.constituencies;
