// import Promise from 'bluebird';
import React, { useState, useEffect } from 'react';
import round from 'lodash/round';
import orderBy from 'lodash/orderBy';
import store from 'store';
import Moment from 'moment';
import { extendMoment } from 'moment-range';
import { Segment, Button, Table, Popup, Checkbox, Loader, Comment, Menu, Icon, Input, Dropdown, Flag } from 'semantic-ui-react';
import { DateInput } from 'semantic-ui-calendar-react';
import {
  DATE_FORMAT,
  roundFixedView, TableHeaderCell,
  calcStatsCtr, calcStatsCr, calcStatsEcpc, calcStatsEcpa, calcStatsRevenue, calcStatsRoi,
} from '../../utils';
import { dataIndex, statsIndex, saveStore } from '../../store';
import api  from '../../api';
import './style.scss';
import Statistics from '../Statistics';
const moment = extendMoment(Moment);


function Banners(props = {}) {
  // const now = Date.now();
  const {
    switchStamp,
    auth,
    dates, setDates,
    searchQuery, setSearchQuery,
  } = props;
  const [state, setState] = useState({
    rows: [],
    rowsCount: -1,
  });

  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const [selected, setSelected] = useState({});
  const [opened, setOpened] = useState({});
  const storeBannersFilter = store.get('tsapp.banners.filter') || {};
  const [sortProp, setSortProp] = useState([storeBannersFilter['sortProp'] || 'cr', storeBannersFilter['sortValue'] || false]);
  const [filterState, setFilterState] = useState('all');

  function loadData(fullLoad = false) {
    setLoading(true);
    (!!fullLoad
      ? Promise.all([
          api.getCampaignsAndCreatives(auth.token),
          api.getCreativesStats(auth.token, dates.from, dates.to),
        ])
      : api.getCreativesStats(auth.token, dates.from, dates.to)
    )
      .then(function () {
        const creatives = Object.entries(dataIndex.creatives).map(([id, creative]) => creative);
        if (creatives.length) {
          // console.log(statsIndex);
          saveStore();
        }
        setState({
          rows: creatives,
          rowsCount: creatives.length,
        });
        setLoading(false);
      })
      .catch(function (error) {
        console.error(error);
        setState({
          rows: [],
          rowsCount: -1,
        });
        const errMsg = error.toString();
        setLoadingError(errMsg);
        setLoading(false);
      });
  }

  useEffect(() => {
    if (loading || loadingError || !(auth && auth.token)) {
      return null;
    }
    if (state.rowsCount < 0) {
      loadData(switchStamp === 0);
      return null;
    }
  });

  function onSort(prop) {
    setSortProp([prop, sortProp[0] === prop ? !sortProp[1] : false]);
  }

  function onSelect(id) {
    if (selected[id]) {
      delete selected[id];
    } else {
      selected[id] = true;
    }
    setSelected({
      ...selected,
    });
  }

  function onOpen(id) {
    if (opened[id]) {
      delete opened[id];
    } else {
      opened[id] = true;
    }
    setOpened({
      ...opened,
    });
  }

  function creativeRun(id) {
    setLoading(true);
    api.runCreative(auth.token, id)
      .then(() => loadData(true))
      .catch((error) => {
        setLoadingError(error.toString());
        setLoading(false);
      })
  }

  function creativePause(id) {
    setLoading(true);
    api.pauseCreative(auth.token, id)
      .then(() => loadData(true))
      .catch((error) => {
        setLoadingError(error.toString());
        setLoading(false);
      })
  }

  let totalStats = {
    impressions:  0,
    clicks:       0,
    leads:        0,
    price:        0,
    income:       0,
    ctr:          0,
    cr:           0,
    ecpc:         0,
    ecpa:         0,
    revenue:      0,
    roi:          0,
  };

  const filterDates = Array.from(moment.range(moment(dates.from, DATE_FORMAT), moment(dates.to, DATE_FORMAT)).by('day')).map(d => d.format(DATE_FORMAT));
  let rowsSortIndexCounter = 0;
  const rowsSortIndex = [];
  const rowsIndex = {};
  const $rows = [];

  state.rows.forEach((creative) => {
    const creativeId = creative && creative.id;
    if (!(creativeId && dataIndex.creatives[creativeId])) {
      return null;
    }
    let campaign;
    if (creative.campaign_id) {
      campaign = dataIndex.campaigns[creative.campaign_id];
    }
    if (filterState !== 'all') {
      switch(filterState) {
        case 'active':
          if (!creative.active || creative.pending || !campaign || !campaign.active) return null;
          break;
        case 'disabled':
          if (creative.active || creative.pending || !(campaign && campaign.active)) return null;
          break;
        case 'pending':
          if (!(creative && creative.pending)) return null;
          break;
        default:
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !~((creative.id + '').indexOf(q)) &&
        !~(creative.brandname.toLowerCase()).indexOf(q) &&
        !~(creative.headline.toLowerCase()).indexOf(q) &&
        (campaign ? !~(campaign.name.toLowerCase().indexOf(q)) : false)
      ) {
        return null;
      }
    }
    
    const bannerIndex = rowsSortIndexCounter++;
    const imageUrl = api.getImageUrl(creative.image);
    
    creative.impressions = 0;
    creative.clicks      = 0;
    creative.leads       = 0;
    creative.price       = 0;
    creative.income      = 0;
    creative.ctr         = 0;
    creative.cr          = 0;
    creative.ecpc        = 0;
    creative.ecpa        = 0;
    creative.revenue     = 0;
    creative.roi         = 0;

    filterDates.forEach(date => {
      if (!(statsIndex[date] && statsIndex[date].creatives[creativeId])) {
        return null;
      }
      const stat = statsIndex[date].creatives[creativeId];
      creative.impressions += stat.impressions;
      creative.clicks      += stat.clicks;
      creative.leads       += stat.leads;
      creative.price       += stat.amount;
      creative.income      += stat.lead_price;
    });
    
    creative.ctr     = calcStatsCtr(creative.impressions, creative.clicks);
    creative.cr      = calcStatsCr(creative.clicks, creative.leads);
    creative.ecpc    = calcStatsEcpc(creative.clicks, creative.price);
    creative.ecpa    = calcStatsEcpa(creative.leads, creative.price);
    creative.revenue = calcStatsRevenue(creative.impressions, creative.price, creative.income);
    creative.roi     = calcStatsRoi(creative.impressions, creative.leads, creative.price, creative.revenue);
    
    if (rowsIndex[imageUrl]) {
      rowsIndex[imageUrl].creatives[creativeId] = creative;
    } else {
      rowsIndex[imageUrl] = {
        bannerIndex,
        imageUrl,
        creatives: {
          [creativeId]: creative,
        },
      };
    }
  });

  Object.keys(rowsIndex).forEach((imageUrl, bannerIndex) => {
    const banner = rowsIndex[imageUrl];
    
    banner.impressions = 0;
    banner.clicks      = 0;
    banner.leads       = 0;
    banner.price       = 0;
    banner.income      = 0;
    banner.ctr         = 0;
    banner.cr          = 0;
    banner.ecpc        = 0;
    banner.ecpa        = 0;
    banner.revenue     = 0;
    banner.roi         = 0;

    banner.creatives = Object.entries(banner.creatives).map(([id, creative]) => {
      if (!selected['c-' + id]) {
        banner.impressions += creative.impressions;
        banner.clicks      += creative.clicks;
        banner.leads       += creative.leads;
        banner.price       += creative.price;
        banner.income      += creative.income;
      }
      return creative;
    });

    banner.ctr     = calcStatsCtr(banner.impressions, banner.clicks);
    banner.cr      = calcStatsCr(banner.clicks, banner.leads);
    banner.ecpc    = calcStatsEcpc(banner.clicks, banner.price);
    banner.ecpa    = calcStatsEcpa(banner.leads, banner.price);
    banner.revenue = calcStatsRevenue(banner.impressions, banner.price, banner.income);
    banner.roi     = calcStatsRoi(banner.impressions, banner.leads, banner.price, banner.revenue);

    if (!selected['bi-' + imageUrl]) {
      totalStats.impressions  += banner.impressions;
      totalStats.clicks       += banner.clicks;
      totalStats.leads        += banner.leads;
      totalStats.price        += banner.price;
      totalStats.income       += banner.income;
    }

    rowsSortIndex.push({
      ...banner,
      bannerIndex,
    });

    const $row = [
      (
        <Table.Row key={'bannerImage-' + banner.id} style={{ textDecoration: !!(selected['bi-' + imageUrl]) ? 'line-through' : '' }} active={!!opened['bi-' + imageUrl]}>
          <Table.Cell colSpan={3} className='monoFont' style={{ cursor: 'pointer' }} onClick={() => onOpen('bi-' + imageUrl)}>
            <Popup position='right center' flowing hoverable trigger={<Button color='blue' style={{ margin: '3px 5px 2px 2px', padding: '4px' }} size='tiny' icon='image' />}>
              <Comment.Group>
                <Comment>
                  <Comment.Avatar href={imageUrl} title={imageUrl} alt={imageUrl} rel='noreferrer' target='_blank' src={imageUrl} />
                </Comment>
              </Comment.Group>
            </Popup>
            {'/' + imageUrl.split('/').slice(-5).join('/')}
          </Table.Cell>
          <Table.Cell className='tar monoFont'>{roundFixedView(banner.impressions / 1000, 3)}</Table.Cell>
          <Table.Cell className='tar monoFont'>{roundFixedView(banner.clicks, 0)}</Table.Cell>
          <Table.Cell className='tar monoFont'>{roundFixedView(banner.leads, 0)}</Table.Cell>
          <Table.Cell className='tar monoFont'>{roundFixedView(banner.ctr, 2)}</Table.Cell>
          <Table.Cell className='tar monoFont'>{roundFixedView(banner.cr, 2)}</Table.Cell>
          <Table.Cell className='tar monoFont'>{roundFixedView(banner.price, 3)}</Table.Cell>
          <Table.Cell className='tar monoFont'>{roundFixedView(banner.income, 3)}</Table.Cell>
          <Table.Cell className='tar monoFont' positive={banner.revenue > 0} negative={banner.revenue < 0}>{banner.revenue > 0 ? '+' : ''}{roundFixedView(banner.revenue, 3)}</Table.Cell>
          <Table.Cell className='tar monoFont' style={{ cursor: 'pointer' }} positive={banner.roi > 0} negative={banner.roi < 0} onClick={() => onSelect('bi-' + imageUrl)}>{banner.revenue > 0 ? '+' : ''}{roundFixedView(banner.roi, 2)}</Table.Cell>
        </Table.Row>
      )
    ];

    if (opened['bi-' + imageUrl]) {
      orderBy(banner.creatives, sortProp[0], !!sortProp[1] ? 'asc' : 'desc').forEach(creative => {
        const creativeUrls = creative.urls.filter(urlData => (urlData && urlData.status === 1) && urlData.id && urlData.url);
        let campaign;
        if (creative.campaign_id) {
          campaign = dataIndex.campaigns[creative.campaign_id];
        }
        $row.push(
          <Table.Row key={'creative-' + creative.id} warning={!creative.active || creative.pending || !campaign || !campaign.active} style={{ fontSize: '0.8em', textDecoration: !!(selected['c-' + creative.id]) ? 'line-through' : '' }}>
            <Table.Cell className='tac'>
              {(creative.pending) ? <Loader active inline size='mini'/>
                : ((creative.rejected) ? <Button color='red' style={{ margin: '0 5px 0 0', padding: '2px' }} size='tiny' icon='warning'/>
                  : <Checkbox slider disabled={!(campaign && campaign.active)}  checked={!!(campaign && campaign.active && creative.active)} onClick={() => (campaign && campaign.active && creative.active) ? creativePause(creative.id) : creativeRun(creative.id) } />
                )
              }
            </Table.Cell>
            <Table.Cell className='monoFont'>{'↳'}&thinsp;{creative.id}</Table.Cell>
            <Table.Cell className='monoFont'>
              {(campaign && campaign.countries && campaign.countries.length > 0) && campaign.countries.map(countryCode => (<Flag key={'countryCode-' + countryCode} name={countryCode.toLowerCase()} />))}
              {campaign && <b>{campaign.name}</b>}&nbsp;
              <Popup position='right center' flowing hoverable trigger={<Button color='blue' style={{ margin: '0 5px 0 0', padding: '2px' }} size='tiny' icon='info'/>}>
                <Comment.Group>
                  <Comment>
                    <Comment.Content>
                      <span className='author'>{creative.brandname}</span>
                      <Comment.Text style={{ margin: '0', padding: '0' }}>
                        <p style={{ marginBottom: '3px' }}>{creative.headline}</p>
                        {creativeUrls.length > 0 && (
                          <ul style={{ margin: '0', padding: '0' }}>
                            {creativeUrls.map(urlData => (
                              <li key={urlData} style={{ listStyle: 'none' }}>
                                <a href={urlData.url} title={urlData.url} alt={urlData.url} rel='noreferrer' target='_blank'>{urlData.id}</a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </Comment.Text>
                    </Comment.Content>
                  </Comment>
                </Comment.Group>
              </Popup>
              <i>{creative.brandname}</i>
            </Table.Cell>
            <Table.Cell className='tar monoFont'>{roundFixedView(creative.impressions / 1000, 3)}</Table.Cell>
            <Table.Cell className='tar monoFont'>{roundFixedView(creative.clicks, 0)}</Table.Cell>
            <Table.Cell className='tar monoFont'>{roundFixedView(creative.leads, 0)}</Table.Cell>
            <Table.Cell className='tar monoFont'>{roundFixedView(creative.ctr, 2)}</Table.Cell>
            <Table.Cell className='tar monoFont'>{roundFixedView(creative.cr, 2)}</Table.Cell>
            <Table.Cell className='tar monoFont'>{roundFixedView(creative.price, 3)}</Table.Cell>
            <Table.Cell className='tar monoFont'>{roundFixedView(creative.income, 3)}</Table.Cell>
            <Table.Cell className='tar monoFont' positive={creative.revenue > 0} negative={creative.revenue < 0}>{creative.revenue > 0 ? '+' : ''}{roundFixedView(creative.revenue, 3)}</Table.Cell>
            <Table.Cell className='tar monoFont' style={{ cursor: 'pointer' }} positive={creative.roi > 0} negative={creative.roi < 0} onClick={() => onSelect('c-' + creative.id)}>{creative.revenue > 0 ? '+' : ''}{roundFixedView(creative.roi, 2)}</Table.Cell>
          </Table.Row>
        );
      });
    }

    $rows.push($row);
  });

  totalStats.ctr      = calcStatsCtr(totalStats.impressions, totalStats.clicks);
  totalStats.cr       = calcStatsCtr(totalStats.clicks, totalStats.leads);
  totalStats.ecpc     = calcStatsEcpc(totalStats.clicks, totalStats.price);
  totalStats.ecpa     = calcStatsEcpa(totalStats.leads, totalStats.price);
  totalStats.revenue  = calcStatsRevenue(totalStats.impressions, totalStats.price, totalStats.income);
  totalStats.roi      = calcStatsRoi(totalStats.impressions, totalStats.leads, totalStats.price, totalStats.revenue);

  return (
    <>
      {loadingError && <Segment inverted color='red' onClick={() => setLoadingError(null)}>
        <Button onClick={() => setLoadingError(null)} floated='right' color='red' icon='close' size='tiny' style={{ marginTop: '-6px' }}/>
        <p>{loadingError}</p>
      </Segment>}
      <Statistics stats={state.rowsCount > 0 && totalStats} />
      <Segment loading={loading} style={{ padding: '0', border: '0' }}>
        <Menu attached='top'>
          <Menu.Item>
            <DateInput
              style={{ width: '133px' }}
              disabled={loading}
              placeholder='Date From'
              dateFormat={DATE_FORMAT}
              value={dates.from}
              // icon={false}
              iconPosition='left'
              maxDate={dates.to}
              onChange={(e, v) => setDates({ ...dates, from: v.value })}
            />
            <DateInput
              style={{ width: '133px', marginLeft: '5px' }}
              disabled={loading}
              placeholder='Date To'
              dateFormat={DATE_FORMAT}
              value={dates.to}
              // icon={false}
              iconPosition='left'
              minDate={dates.from}
              maxDate={moment().format(DATE_FORMAT)}
              onChange={(e, v) => setDates({ ...dates, to: v.value })}
            />
          </Menu.Item>
          <Menu.Item>
            <Dropdown placeholder='State' compact style={{ width: '120px' }}
                      onChange={(e,v) => setFilterState(v.value)}
                      value={filterState} selection options={[
                        { key: 'all', text: 'All', value: 'all' },
                        { key: 'active', text: 'Active', value: 'active' },
                        { key: 'disabled', text: 'Disabled', value: 'disabled' },
                        { key: 'pending', text: 'Pending', value: 'pending' },
                      ]}/>
          </Menu.Item>
          <Menu.Menu position='right'>
            <Menu.Item>
              <Input placeholder='Search' style={{ width: '240px' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
            </Menu.Item>
            <Menu.Item disabled={loading} onClick={() => loadData(true)}><Icon name='refresh' color='violet'/>Load Data</Menu.Item>
            <Menu.Item disabled={loading} onClick={() => loadData()}><Icon name='refresh' color='blue'/>Load Stats</Menu.Item>
          </Menu.Menu>
        </Menu>
        <Table compact striped sortable celled selectable attached='bottom'>
          <Table.Header>
            <Table.Row>
              <TableHeaderCell sort={sortProp} onSort={onSort} style={{ width: '65px' }} prop='active' title='Active'/>
              <TableHeaderCell sort={sortProp} onSort={onSort} style={{ width: '80px' }} prop='id' title='ID'/>
              <TableHeaderCell sort={sortProp} onSort={onSort} prop='name' title='Name'/>
              <TableHeaderCell sort={sortProp} onSort={onSort} style={{ width: '90px' }} prop='impressions' title='Imprs'/>
              <TableHeaderCell sort={sortProp} onSort={onSort} style={{ width: '85px' }} prop='clicks' title='Clicks'/>
              <TableHeaderCell sort={sortProp} onSort={onSort} style={{ width: '85px' }} prop='leads' title='Leads'/>
              <TableHeaderCell sort={sortProp} onSort={onSort} style={{ width: '85px' }} prop='ctr' title='CTR %'/>
              <TableHeaderCell sort={sortProp} onSort={onSort} style={{ width: '85px' }} prop='cr' title='CR %'/>
              <TableHeaderCell sort={sortProp} onSort={onSort} style={{ width: '85px' }} prop='price' title='Price'/>
              <TableHeaderCell sort={sortProp} onSort={onSort} style={{ width: '85px' }} prop='income' title='Income'/>
              <TableHeaderCell sort={sortProp} onSort={onSort} style={{ width: '85px' }} prop='revenue' title='Revenue'/>
              <TableHeaderCell sort={sortProp} onSort={onSort} style={{ width: '85px' }} prop='roi' title='ROI %'/>
            </Table.Row> 
          </Table.Header>
          <Table.Body>{orderBy(rowsSortIndex, sortProp[0], !!sortProp[1] ? 'asc' : 'desc').map(item => $rows[item.bannerIndex])}</Table.Body>
          <Table.Footer>
            <Table.Row>
              <Table.HeaderCell colSpan={3}>Count: {rowsSortIndex.length}</Table.HeaderCell>
              <Table.HeaderCell className='tar monoFont'>{round(totalStats.impressions / 1000, 3).toFixed(3)}</Table.HeaderCell>
              <Table.HeaderCell className='tar monoFont'>{totalStats.clicks}</Table.HeaderCell>
              <Table.HeaderCell className='tar monoFont'>{totalStats.leads}</Table.HeaderCell>
              <Table.HeaderCell className='tar monoFont'>{totalStats.ctr.toFixed(2)}</Table.HeaderCell>
              <Table.HeaderCell className='tar monoFont'>{totalStats.cr.toFixed(2)}</Table.HeaderCell>
              <Table.HeaderCell className='tar monoFont'>{round(totalStats.price,  3).toFixed(3)}</Table.HeaderCell>
              <Table.HeaderCell className='tar monoFont'>{round(totalStats.income, 3).toFixed(3)}</Table.HeaderCell>
              <Table.HeaderCell className='tar monoFont'>{(totalStats.revenue > 0 ? '+' : '') + round(totalStats.revenue, 3).toFixed(3)}</Table.HeaderCell>
              <Table.HeaderCell className='tar monoFont'>{(totalStats.roi > 0 ? '+' : '') + round(totalStats.roi, 2)}%</Table.HeaderCell>
            </Table.Row>
          </Table.Footer>
        </Table>
      </Segment>
    </>
  );
}

export default Banners;
