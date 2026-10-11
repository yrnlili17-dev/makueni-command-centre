/**
 * Administrative geography for Makueni County.
 * Source: Makueni County Government, "About Makueni County" and constituency pages.
 * Reference: https://makueni.go.ke/about-2/
 * Six constituencies and 30 county assembly wards. Names are normalized for
 * dropdown/search matching; confirm against the latest IEBC gazette before
 * using this as an electoral-boundary authority.
 */
export const MAKUENI_GEOGRAPHY = [
  {
    constituency: "Mbooni",
    wards: ["Tulimani", "Mbooni", "Kithungo/Kitundu", "Kiteta/Kisau", "Kako/Waia", "Kalawa"],
  },
  {
    constituency: "Kilome",
    wards: ["Kiima Kiu/Kalanzoni", "Mukaa", "Kasikeu"],
  },
  {
    constituency: "Kaiti",
    wards: ["Kee", "Kilungu", "Ilima", "Ukia"],
  },
  {
    constituency: "Makueni",
    wards: ["Nzaui/Kilili/Kalamba", "Muvau/Kikumini", "Kathonzweni", "Mavindini", "Kitise/Kithuki", "Wote", "Mbitini"],
  },
  {
    constituency: "Kibwezi West",
    wards: ["Makindu", "Kikumbulyu North", "Kikumbulyu South", "Nguumo", "Nguu/Masumba", "Emali/Mulala"],
  },
  {
    constituency: "Kibwezi East",
    wards: ["Masongaleni", "Mtito Andei", "Thange", "Ivingoni/Nzambani"],
  },
] as const;

export const MAKUENI_CONSTITUENCIES = MAKUENI_GEOGRAPHY.map(
  ({ constituency }) => constituency,
);

export const MAKUENI_WARDS = MAKUENI_GEOGRAPHY.flatMap(
  ({ constituency, wards }) => wards.map((ward) => ({ constituency, ward })),
);
