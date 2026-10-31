// Design references for /overseas?focus=design (/api/site/overseas-design-resources).
//
// Production keeps these outside the news timeline: a source snapshot filled from
// public RSS (BP&O, Yanko Design), read only through this module. The snapshot and
// the collector are on /opt/3chot and are not in git. The catalog below is the
// contract the page renders; items stay empty until that reader is copied.
// A later independent RSS change should fill `items` from these feedUrl values
// without adding another public route.
import type { OverseasDesignResources, OverseasDesignSource } from "@aihot/contracts/overseas";

interface DesignSourceDef extends OverseasDesignSource {
  /** Collector input. Omitted from the public payload. */
  feedUrl?: string;
}

export const OVERSEAS_DESIGN_CATALOG: DesignSourceDef[] = [
  {
    id: "overseas-design-bpando",
    name: "BP&O · 品牌与包装设计",
    url: "https://bpando.org/",
    feedUrl: "https://bpando.org/feed/",
    status: "active",
    lastOkAt: null,
    health: null,
    note: "公开 RSS，关注品牌视觉与包装案例；每天检查一次。",
  },
  {
    id: "overseas-design-yanko",
    name: "Yanko Design · 产品与科技设计",
    url: "https://www.yankodesign.com/",
    feedUrl: "https://www.yankodesign.com/feed/",
    status: "active",
    lastOkAt: null,
    health: null,
    note: "公开 RSS，筛选数码配件与产品设计；每天检查一次。",
  },
  {
    id: "overseas-design-pinterest",
    name: "Pinterest",
    url: "https://www.pinterest.com/",
    status: "not_connected",
    lastOkAt: null,
    health: null,
    note: "设计灵感入口；尚未接通作品自动采集，需要确认账号与授权方案。",
  },
  {
    id: "overseas-design-shutterstock",
    name: "Shutterstock",
    url: "https://www.shutterstock.com/zh/",
    status: "not_connected",
    lastOkAt: null,
    health: null,
    note: "设计素材库入口；尚未接通自动采集，下载与使用素材需遵守供应商许可。",
  },
  {
    id: "overseas-design-zcool",
    name: "站酷",
    url: "https://www.zcool.com.cn/discover",
    status: "not_connected",
    lastOkAt: null,
    health: null,
    note: "设计作品入口；尚未获得稳定的公开作品采集入口。",
  },
];

function publicSource(source: DesignSourceDef): OverseasDesignSource {
  return {
    id: source.id,
    name: source.name,
    url: source.url,
    status: source.status,
    lastOkAt: source.lastOkAt,
    health: source.health,
    note: source.note,
  };
}

export async function loadOverseasDesignResources(): Promise<OverseasDesignResources> {
  const sources = OVERSEAS_DESIGN_CATALOG.map(publicSource);
  return { sources, items: [], total: 0, checkedAt: null };
}
