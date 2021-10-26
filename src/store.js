import store from 'store';


export const dataIndex = store.get('tsapp.dataIndex') || {};
export const statsIndex = store.get('tsapp.statsIndex') || {};
export const reportsIndex = store.get('tsapp.reportsIndex') || {};


/// Data Index

if (!dataIndex.campaigns) {
  dataIndex.campaigns = {};
}
if (!dataIndex.creatives) {
  dataIndex.creatives = {};
}
if (!dataIndex.adspots) {
  dataIndex.adspots = {};
}
if (!dataIndex.urls) {
  dataIndex.urls = {};
}
if (!dataIndex.conversions) {
  dataIndex.conversions = {};
}



/// Reports Index

if (!reportsIndex.campaingsList) {
  reportsIndex.campaingsList = {
    ttl: 60,
    lastSync: {},
  };
}
if (!reportsIndex.campaingsCreatives) {
  reportsIndex.campaingsCreatives = {
    ttl: 60,
    lastSync: {},
  };
}
if (!reportsIndex.campaingsCreativesStats) {
  reportsIndex.campaingsCreativesStats = {
    ttl: 60,
    lastSync: {},
  };
}
if (!reportsIndex.campaingsAdspotsStats) {
  reportsIndex.campaingsAdspotsStats = {
    ttl: 600,
    lastSync: {},
  };
}
if (!reportsIndex.creativeStats) {
  reportsIndex.creativeStats = {
    ttl: 600,
    lastSync: {},
  };
}


export function saveStore() {
  store.set('tsapp.dataIndex', dataIndex);
  store.set('tsapp.statsIndex', statsIndex);
  store.set('tsapp.reportsIndex', reportsIndex);
}
