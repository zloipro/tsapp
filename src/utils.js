// import Promise from 'bluebird';
import round from 'lodash/round';
import repeat from 'lodash/repeat';
import React from 'react';
import { Table } from 'semantic-ui-react';


export const DEFAULT_ROUND = 6;
export const DATE_FORMAT = 'YYYY-MM-DD';


export function roundFixedView(value = 0, fix = 3) {
  const v = round(value, fix);
  return v !== 0 ? v.toFixed(fix) : <span style={{ opacity: '0.6' }}>0{fix > 0 ? '.' : ''}{repeat('0', fix)}</span>
}

export function TableHeaderCell(props) {
  const { prop, title, collapsing, style, sort, onSort } = props;
  return (
    <Table.HeaderCell onClick={() => onSort(prop)} style={style} collapsing={!!collapsing}>{title + (sort[0] === prop ? (!!sort[1] ? ' ↓' :  ' ↑') : '')}</Table.HeaderCell>
  );
}


export function calcStatsCtr(impressions = 0, clicks = 0) {
  return (impressions > 0 && clicks > 0) ? round((clicks / impressions) * 100, DEFAULT_ROUND) : 0; // !!!
}

export function calcStatsCr(clicks = 0, leads = 0) {
  return (clicks > 0 && leads > 0) ? round((leads / clicks) * 100, DEFAULT_ROUND) : 0; // !!!
}

export function calcStatsLtr(impressions = 0, leads = 0) {
  return (impressions > 0 && leads > 0) ? round((leads / impressions) * 100, DEFAULT_ROUND) : 0; // !!!
}

export function calcStatsEcpc(clicks = 0, price = 0) {
  return (clicks > 0  && price > 0) ? round((price / clicks), DEFAULT_ROUND) : 0; // !!!
}

export function calcStatsEcpa(leads = 0, price = 0) {
  return (leads > 0  && price > 0) ? round((price / leads), DEFAULT_ROUND) : 0; // !!!
}

export function calcStatsRevenue(leads = 0, price = 0, income = 0) {
  return leads > 0 ? round(income - price, DEFAULT_ROUND) : -price; // !!!
}

export function calcStatsRoi(impressions = 0, leads = 0, price = 0, revenue = 0) {
  return (impressions > 0 && price > 0) ? (leads > 0 ? round(revenue / price * 100, DEFAULT_ROUND) : -100) : 0; // !!!
}
