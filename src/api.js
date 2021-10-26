import Promise from 'bluebird';
import axios from 'axios';
import qs from 'qs';
import Moment from 'moment';
import { extendMoment } from 'moment-range';
import { DATE_FORMAT } from './utils';
import { dataIndex, statsIndex, reportsIndex } from './store';
const moment = extendMoment(Moment);


const API_BUCKET_BANNER = 'https://admin.trafficstars.com/media/';
const API_DEFAULT_SIZE = 200;
const API_HEADERS = {
  // 'Access-Control-Allow-Origin': '*',
  // 'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE',
  // 'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};


async function auth(clientId, clientSecret, login, password) {
  const now = Date.now();
  const response = await axios({
    method: 'post',
    mode: 'no-cors',
    url: 'https://api.trafficstars.com/v1/auth/token',
    headers: {
      ...API_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    responseType: 'json',
    data: qs.stringify({
      grant_type:     'password',
      client_id:      clientId,
      client_secret:  clientSecret,
      username:       login,
      password:       password,
    }),
    changeOrigin: true,
  });
  return {
    token:        response.data.access_token,
    tokenRefresh: response.data.refresh_token,
    ttl:          now + (response.data.expires_in * 1e3),
  };
}

async function authRefresh(clientId, clientSecret, tokenRefresh) {
  const now = Date.now();
  const response = await axios({
    method: 'post',
    url: 'https://api.trafficstars.com/v1/auth/token',
    headers: {
      ...API_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    responseType: 'json',
    data: qs.stringify({
      grant_type:     'refresh_token',
      client_id:      clientId,
      client_secret:  clientSecret,
      refresh_token:  tokenRefresh,
    }),
    changeOrigin: true,
  });
  return {
    token:        response.data.access_token,
    tokenRefresh: response.data.refresh_token,
    ttl:          now + (response.data.expires_in * 1e3),
  };
}

async function getCampaigns(token) {
  const now = Date.now();
  
  const response = await axios.get('https://api.trafficstars.com/v1/campaign/list', {
    responseType: 'json',
    headers: {
      ...API_HEADERS,
      Authorization: 'bearer ' + token,
    },
    params: {
      size: API_DEFAULT_SIZE,
    },
    changeOrigin: true,
  });
  
  if (!(response.data.response && response.data.response.length)) {
    return null;
  }

  response.data.response.forEach(campaign => {
    dataIndex.campaigns[campaign.id] = {
      ...campaign,
      creatives: dataIndex.campaigns[campaign.id] ? (dataIndex.campaigns[campaign.id].creatives || []) : [],
      active: campaign.status === 1,
      pending: campaign.status === 0,
      rejected: campaign.status === 4,
      lastSync: now,
    }
  });
}

async function getCampaignCreatives(token, campaign_id) {
  const now = Date.now();
  
  const response = await axios.get('https://api.trafficstars.com/v1/banner/list', {
    responseType: 'json',
    headers: {
      ...API_HEADERS,
      Authorization: 'bearer ' + token,
    },
    params: {
      campaign_id,
      size: API_DEFAULT_SIZE,
    },
    changeOrigin: true,
  });
  
  if (!(response.data.response && response.data.response.length)) {
    return null;
  }

  response.data.response.forEach(creative => {
    if (!(creative && creative.id && creative.campaign_id && creative.image)) {
      return;
    }
    if (dataIndex.campaigns[creative.campaign_id]) {
      if (!dataIndex.campaigns[creative.campaign_id].creatives) {
        dataIndex.campaigns[creative.campaign_id].creatives = [creative.id];
      } else {
        if (!dataIndex.campaigns[creative.campaign_id].creatives.includes(creative.id)) {
          dataIndex.campaigns[creative.campaign_id].creatives.push(creative.id);
        }
      }
    }
    dataIndex.creatives[creative.id] = {
      ...creative,
      active: creative.status === 1,
      pending: creative.status === 0,
      rejected: creative.status === 4,
      lastSync: now,
    };
    dataIndex.urls = {};
    if (creative.urls && creative.urls.length) {
      creative.urls.forEach(urlData => {
        if (!(urlData && urlData.id && urlData.url)) {
          return null;
        }
        dataIndex.urls[urlData.url] = urlData;
      });
    }
  });
}

async function getCampaignsAndCreatives(token) {
  await getCampaigns(token);
  await Promise.map(Object.entries(dataIndex.campaigns), ([id]) => getCampaignCreatives(token, id), { concurrency: 6 });
}

async function getCampaignCreativesStats(token, campaignId, dateFrom, dateTo) {
  const now = Date.now();
  
  if (dateTo && dateFrom !== dateTo) {
    const dates = Array.from(moment.range(moment(dateFrom, DATE_FORMAT), moment(dateTo, DATE_FORMAT)).by('day')).map(d => d.format(DATE_FORMAT));
    await Promise.map(dates, d => getCampaignCreativesStats(token, campaignId, d), { concurrency: 1 })
    return null;
  }
  
  const reportKey = (dateFrom === moment().format(DATE_FORMAT) || dateFrom === moment().add(1, 'd').format(DATE_FORMAT)) ? null : (campaignId + '-' + dateFrom);
  if (reportKey && reportsIndex.campaingsCreativesStats.lastSync[reportKey] && ((reportsIndex.campaingsCreativesStats.lastSync[reportKey] + reportsIndex.campaingsCreativesStats.ttl * 1e3) >= now)) {
    return;
  }

  const response = await axios.get('https://api.trafficstars.com/v1.1/advertiser/custom/report/by-creative', {
    responseType: 'json',
    headers: {
      ...API_HEADERS,
      Authorization: 'bearer ' + token,
    },
    params: {
      campaign_id:  campaignId,
      date_from:    dateFrom,
      date_to:      dateFrom,
    },
    changeOrigin: true,
  });

  if (!(response.data && response.data.length)) {
    return null;
  }

  if (!statsIndex[dateFrom]) {
    statsIndex[dateFrom] = {
      campaigns: {},
      creatives: {},
      adspots: {},
    };
  }

  response.data.forEach(stats => {
    if (stats && stats.banner_id) {
      // console.log(stats);
      statsIndex[dateFrom].creatives[stats.banner_id] = {
        ...stats,
        lastSync: now,
      };
    }
  });

  if (reportKey) {
    reportsIndex.campaingsCreativesStats.lastSync[reportKey] = now;
  }
}

async function getCampaignAdspotsStats(token, campaignId, dateFrom, dateTo) {
  const now = Date.now();
  if (dateTo && dateFrom !== dateTo) {
    const dates = Array.from(moment.range(moment(dateFrom, DATE_FORMAT), moment(dateTo, DATE_FORMAT)).by('day')).map(d => d.format(DATE_FORMAT));
    await Promise.map(dates, d => getCampaignAdspotsStats(token, campaignId, d), { concurrency: 1 })
    return null;
  }
  
  const reportKey = (dateFrom === moment().format(DATE_FORMAT) || dateFrom === moment().add(1, 'd').format(DATE_FORMAT)) ? null : (campaignId + '-' + dateFrom);
  if (reportKey && reportsIndex.campaingsAdspotsStats.lastSync[reportKey] && ((reportsIndex.campaingsAdspotsStats.lastSync[reportKey] + reportsIndex.campaingsAdspotsStats.ttl * 1e3) >= now)) {
    return;
  }

  const response = await axios.get('https://api.trafficstars.com/v1.1/advertiser/custom/report/by-spot', {
    responseType: 'json',
    headers: {
      ...API_HEADERS,
      Authorization: 'bearer ' + token,
    },
    params: {
      campaign_id:  campaignId,
      date_from:    dateFrom,
      date_to:      dateFrom,
    },
    changeOrigin: true,
  });

  if (!statsIndex[dateFrom]) {
    statsIndex[dateFrom] = {
      campaigns: {},
      creatives: {},
      adspots: {},
    };
  }

  response.data.forEach(stats => {
    if (stats && stats.spot_id) {
      // console.log(stats);
      statsIndex[dateFrom].adspots[stats.spot_id] = {
        ...stats,
        lastSync: now,
      };
    }
  });

  if (reportKey) {
    reportsIndex.campaingsAdspotsStats.lastSync[reportKey] = now;
  }
}

async function getCreativesStats(token, dateFrom, dateTo) {
  const now = Date.now();
  if (dateTo && dateFrom !== dateTo) {
    const dates = Array.from(moment.range(moment(dateFrom, DATE_FORMAT), moment(dateTo, DATE_FORMAT)).by('day')).map(d => d.format(DATE_FORMAT));
    await Promise.map(dates, d => getCreativesStats(token, d), { concurrency: 1 })
    return null;
  }
  
  const reportKey = (dateFrom === moment().format(DATE_FORMAT) || dateFrom === moment().add(1, 'd').format(DATE_FORMAT)) ? null : (dateFrom);
  if (reportKey && reportsIndex.creativeStats.lastSync[reportKey] && ((reportsIndex.creativeStats.lastSync[reportKey] + reportsIndex.creativeStats.ttl * 1e3) >= now)) {
    return null;
  }

  const response = await axios.get(`https://api.trafficstars.com/v1.1/advertiser/custom/report/by-creative`, {
    responseType: 'json',
    headers: {
      ...API_HEADERS,
      Authorization: 'bearer ' + token,
    },
    params: {
      date_from:    dateFrom,
      date_to:      dateFrom,
    },
    changeOrigin: true,
  });
  
  if (!(response.data && response.data.length)) {
    return null;
  }
  
  if (!statsIndex[dateFrom]) {
    statsIndex[dateFrom] = {
      campaigns: {},
      creatives: {},
      adspots: {},
    };
  }

  response.data.forEach(stats => {
    if (stats && stats.banner_id) {
      // console.log(stats);
      statsIndex[dateFrom].creatives[stats.banner_id] = {
        ...stats,
        lastSync: now,
      };
    }
  });

  if (reportKey) {
    reportsIndex.creativeStats.lastSync[reportKey] = now;
  }
}

async function runCampaign(token, id) {
  const now = Date.now();
  const response = await axios.put(`https://api.trafficstars.com/v1/campaign/${id}/run`, {}, {
    headers: {
      ...API_HEADERS,
      Authorization: 'bearer ' + token,
    },
    changeOrigin: true,
  });

  const campaign = response.data;
  if (campaign && campaign.id) {
    dataIndex.campaigns[campaign.id] = {
      ...campaign,
      active: campaign.status === 1,
      pending: campaign.status === 0,
      rejected: campaign.status === 4,
      lastSync: now,
    };
  }
}

async function pauseCampaign(token, id) {
  const now = Date.now();
  const response = await axios.put(`https://api.trafficstars.com/v1/campaign/${id}/pause`, {}, {
    headers: {
      ...API_HEADERS,
      Authorization: 'bearer ' + token,
    },
    changeOrigin: true,
  });

  const campaign = response.data;
  if (campaign && campaign.id) {
    dataIndex.campaigns[campaign.id] = {
      ...campaign,
      active: campaign.status === 1,
      pending: campaign.status === 0,
      rejected: campaign.status === 4,
      lastSync: now,
    };
  }
}

async function runCreative(token, id) {
  const now = Date.now();
  const response = await axios.put(`https://api.trafficstars.com/v1/banner/${id}/run`, {}, {
    headers: {
      ...API_HEADERS,
      Authorization: 'bearer ' + token,
    },
    changeOrigin: true,
  });
  
  const creative = response.data.response;
  if (creative && creative.id) {
    dataIndex.creatives[creative.id] = {
      ...creative,
      active: creative.status === 1,
      pending: creative.status === 0,
      rejected: creative.status === 4,
      lastSync: now,
    };
  }
}

async function pauseCreative(token, id) {
  const now = Date.now();
  const response = await axios.put(`https://api.trafficstars.com/v1/banner/${id}/pause`, {}, {
    headers: {
      ...API_HEADERS,
      Authorization: 'bearer ' + token,
    },
    changeOrigin: true,
  });
  
  const creative = response.data.response;
  if (creative && creative.id) {
    dataIndex.creatives[creative.id] = {
      ...creative,
      active: creative.status === 1,
      pending: creative.status === 0,
      rejected: creative.status === 4,
      lastSync: now,
    };
  }
}

async function getConversions(apiKey, affiliateId, dateFrom, dateTo) {
  const response = await axios(`https://smartlink.clickdealer.com/affiliates/api/1/reports.asmx/Conversions?api_key=${apiKey}&affiliate_id=142387&start_date=10%2F24%2F2021%2000%3A00%3A00&end_date=10%2F25%2F2021%2023%3A59%3A59&include_tests=False&row_limit=100&currency_id=All&disposition_type=All&conversion_type=All&update_filter=False`, {
    // responseType: 'json',
    method: 'GET',
    headers: {
      ...API_HEADERS,
    },
    // params: {
    //   date_from:    dateFrom,
    //   date_to:      dateFrom,
    // },
    // changeOrigin: true,
    mode: 'no-cors',
    crossdomain: true,
  });
  console.log(response);
}

function getImageUrl(imageUrl) {
  return API_BUCKET_BANNER + imageUrl;
}

const apiModule = {
  auth,
  authRefresh,
  getCampaigns,
  getCampaignCreatives,
  getCampaignsAndCreatives,
  getCampaignCreativesStats,
  getCampaignAdspotsStats,
  getCreativesStats,
  runCampaign,
  pauseCampaign,
  runCreative,
  pauseCreative,
  getConversions,
  getImageUrl,
};

export default apiModule;
