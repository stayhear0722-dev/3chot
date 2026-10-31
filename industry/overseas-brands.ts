// Brand filter list for the overseas column. Names match the live /overseas dropdown.
// Alias matching used by production labelling (including the narrower NOMAD pattern)
// still lives on the server and is not applied by this catalog.

export interface OverseasBrand {
  id: string;
  name: string;
  aliases: string[];
  note?: string;
}

export const OVERSEAS_BRANDS: OverseasBrand[] = [
  { id: "torras", name: "图拉斯 TORRAS", aliases: ["图拉斯", "TORRAS", "Ostand"] },
  { id: "anker", name: "安克 Anker", aliases: ["安克", "Anker"] },
  { id: "baseus", name: "倍思 Baseus", aliases: ["倍思", "Baseus"] },
  { id: "ugreen", name: "绿联 UGREEN", aliases: ["绿联", "UGREEN"] },
  { id: "sharge", name: "闪极 SHARGE", aliases: ["闪极", "SHARGE", "Shargeek"] },
  { id: "candysign", name: "制糖 Candysign", aliases: ["制糖", "硬糖", "Candysign"] },
  { id: "belkin", name: "贝尔金 Belkin", aliases: ["贝尔金", "Belkin"] },
  { id: "momax", name: "摩米士 MOMAX", aliases: ["摩米士", "MOMAX"] },
  { id: "pisen", name: "品胜 PISEN", aliases: ["品胜", "PISEN"] },
  { id: "fansdreams", name: "Fansdreams", aliases: ["Fansdreams"] },
  { id: "trozk", name: "Trozk", aliases: ["Trozk"] },
  { id: "lofree", name: "洛斐 Lofree", aliases: ["洛斐", "Lofree"] },
  { id: "ravpower", name: "RAVPower", aliases: ["RAVPower"] },
  { id: "aukey", name: "Aukey", aliases: ["Aukey"] },
  { id: "satechi", name: "Satechi", aliases: ["Satechi"] },
  { id: "mophie", name: "Mophie", aliases: ["Mophie"] },
  { id: "native-union", name: "Native Union", aliases: ["Native Union", "nativeunion", "native_union"] },
  { id: "aulumu", name: "AULUMU", aliases: ["AULUMU"] },
  { id: "nomad", name: "NOMAD", aliases: ["NOMAD", "Nomad Goods", "nomadgoods"] },
  { id: "bellroy", name: "Bellroy", aliases: ["Bellroy"] },
  { id: "peak-design", name: "Peak Design", aliases: ["Peak Design", "peakdesign"] },
  { id: "tegic", name: "Tegic", aliases: ["Tegic"] },
  { id: "nubia", name: "努比亚 Nubia", aliases: ["努比亚", "Nubia"] },
  { id: "wopow", name: "Wopow", aliases: ["Wopow"] },
  { id: "wp", name: "微尔普 W&P", aliases: ["W&P", "微尔普"], note: "微尔普（深圳）电子有限公司，智能充电与数码配件" },
  { id: "idmix", name: "IDMIX", aliases: ["IDMIX"] },
  { id: "testv", name: "TESTV", aliases: ["TESTV"] },
  { id: "bull", name: "公牛 BULL", aliases: ["公牛", "BULL"] },
  { id: "ecoflow", name: "正浩 EcoFlow", aliases: ["正浩", "EcoFlow"], note: "正浩身份暂定为 EcoFlow" },
  { id: "uag", name: "UAG", aliases: ["UAG", "Urban Armor Gear"] },
  { id: "esr", name: "亿色 ESR", aliases: ["亿色", "ESR"] },
  { id: "pitaka", name: "PITAKA", aliases: ["PITAKA", "iPITAKA"] },
  { id: "spigen", name: "Spigen", aliases: ["Spigen", "斯皮根"] },
  { id: "otterbox", name: "OtterBox", aliases: ["OtterBox"] },
  { id: "casetify", name: "CASETiFY", aliases: ["CASETiFY"] },
  { id: "benks", name: "邦克仕 Benks", aliases: ["邦克仕", "Benks"] },
  { id: "smartdevil", name: "闪魔 Smart Devil", aliases: ["闪魔", "Smart Devil", "SmartDevil"] },
  { id: "casebang", name: "Casebang", aliases: ["Casebang"] },
  { id: "moft", name: "MOFT", aliases: ["MOFT"] },
  { id: "rhinoshield", name: "犀牛盾 RHINOSHIELD", aliases: ["犀牛盾", "RHINOSHIELD"] },
  { id: "defense", name: "决色 DEFENSE", aliases: ["DEFENSE", "决色"] },
  { id: "youngkit", name: "Youngkit", aliases: ["Youngkit"], note: "按手机保护壳品牌 Youngkit 接入；与中文猿气的主体关联尚未证实" },
];

const byId = new Map(OVERSEAS_BRANDS.map((brand) => [brand.id, brand]));

export function overseasBrand(id: string): OverseasBrand | undefined {
  return byId.get(id);
}
