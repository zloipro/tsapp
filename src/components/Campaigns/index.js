import Promise from 'bluebird';
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


function Campaigns(props = {}) {
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
  const [opened, setOpened] = useState({});
  const [selected, setSelected] = useState({});
  const storeCampaignsFilter = store.get('tsapp.campaigns.filter') || {};
  const [sortProp, setSortProp] = useState([storeCampaignsFilter['sortProp'] || 'cr', storeCampaignsFilter['sortValue'] || false]);
  const [filterState, setFilterState] = useState('all');

  function loadData(fullLoad = false) {
    setLoading(true);
    (!!fullLoad
      ? Promise.all([
          api.getCampaignsAndCreatives(auth.token),
          api.getCreativesStats(auth.token, dates.from, dates.to),
        ])
      : Promise.all([
          Promise.resolve(Object.entries(dataIndex.campaigns).map(([id, campaign]) => campaign)),
          api.getCreativesStats(auth.token, dates.from, dates.to),
        ])
    )
      .then(async function () {
        const campaigns = Object.entries(dataIndex.campaigns).map(([id, campaign]) => campaign);
        if (campaigns.length) {
          // console.log(statsIndex);
          saveStore();
        }
        setState({
          rows: campaigns,
          rowsCount: campaigns.length,
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

  // useEffect(() => {
  //   console.log('campaigns mounted', switchStamp);
  //   if (componentGlobalTimeout) {
  //     console.log('componentGlobalTimeout', 0);
  //   } else {
  //     componentGlobalTimeout = setTimeout(() => {
  //       console.log('componentGlobalTimeout', 1);
  //       componentGlobalTimeout = null;
  //     }, 1e3)
  //   }
  // },[]);

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

  function campaignRun(id) {
    setLoading(true);
    api.runCampaign(auth.token, id)
      .then(() => loadData(true))
      .catch((error) => {
        setLoadingError(error.toString());
        setLoading(false);
      })
  }

  function campaignPause(id) {
    setLoading(true);
    api.pauseCampaign(auth.token, id)
      .then(() => loadData(true))
      .catch((error) => {
        setLoadingError(error.toString());
        setLoading(false);
      })
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
  let  rowsSortIndexCounter = 0;
  const rowsSortIndex = [];
  const $rows = [];
  if (state && state.rows && state.rows.length) state.rows.forEach((campaign) => {
    switch(filterState) {
      case 'active':
      case 'active-all':
        if (!campaign.active) return null;
        break;
      case 'disabled':
        if (campaign.active) return null;
        break;
      case 'pending':
        if (!campaign.pending) return null;
        break;
      default:
    }
    if (searchQuery) {
      if (
        !~((campaign.id + '').indexOf(searchQuery.toLowerCase())) &&
        !~(campaign.name.toLowerCase()).indexOf(searchQuery.toLowerCase())
      ) {
        return null;
      }
    }
    const $row = [];
    const campaingsCreatives = [];
    const creativesCount = (campaign && campaign.creatives && campaign.creatives.length) ? campaign.creatives.length : 0;

    campaign.impressions = 0;
    campaign.clicks      = 0;
    campaign.leads       = 0;
    campaign.price       = 0;
    campaign.income      = 0;

    if (creativesCount > 0) campaign.creatives.forEach(creativeId => {
      const creative = dataIndex.creatives[creativeId];
      if (!creative) {
        return null;
      }
      switch(filterState) {
        case 'active-all':
          if (!creative.active) return null;
          break;
        default:
      }
      creative.impressions = 0;
      creative.clicks      = 0;
      creative.leads       = 0;
      creative.price       = 0;
      creative.income      = 0;

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

      if (!selected['b-' + creativeId]) {
        campaign.impressions += creative.impressions;
        campaign.clicks      += creative.clicks;
        campaign.leads       += creative.leads;
        campaign.price       += creative.price;
        campaign.income      += creative.income;
      }

      creative.ctr     = calcStatsCtr(creative.impressions, creative.clicks);
      creative.cr      = calcStatsCr(creative.clicks, creative.leads);
      creative.ecpc    = calcStatsEcpc(creative.clicks, creative.price);
      creative.ecpa    = calcStatsEcpa(creative.leads, creative.price);
      creative.revenue = calcStatsRevenue(creative.impressions, creative.price, creative.income);
      creative.roi     = calcStatsRoi(creative.impressions, creative.leads, creative.price, creative.revenue);
      
      campaingsCreatives.push(creative);
    });

    campaign.ctr     = calcStatsCtr(campaign.impressions, campaign.clicks);
    campaign.cr      = calcStatsCr(campaign.clicks, campaign.leads);
    campaign.ecpc    = calcStatsEcpc(campaign.clicks, campaign.price);
    campaign.ecpa    = calcStatsEcpa(campaign.leads, campaign.price);
    campaign.revenue = calcStatsRevenue(campaign.leads, campaign.price, campaign.income);
    campaign.roi     = calcStatsRoi(campaign.impressions, campaign.leads, campaign.price, campaign.revenue);

    rowsSortIndex.push({
      ...campaign,
      campaignIndex:  rowsSortIndexCounter++,
    });
    
    if (!selected['c-' + campaign.id]) {
      totalStats.impressions += campaign.impressions;
      totalStats.clicks      += campaign.clicks;
      totalStats.leads       += campaign.leads;
      totalStats.price       += campaign.price
      totalStats.income      += campaign.income;
    }

    $row.push(
      <Table.Row key={'campaign-' + campaign.id} style={{ textDecoration: !!selected['c-' + campaign.id] ? 'line-through' : ''  }} warning={!campaign.active || campaign.pending} active={!!opened['c-' + campaign.id]}>
        <Table.Cell className='tac'>
          {(campaign.pending)
            ? <Loader active inline size='mini'/>
            : <Checkbox toggle checked={!!campaign.active} onClick={() => !!campaign.active ? campaignPause(campaign.id) : campaignRun(campaign.id) } />
          }
        </Table.Cell>
        <Table.Cell className='monoFont' style={{ cursor: creativesCount && 'pointer' }} onClick={() => creativesCount && onOpen('c-' + campaign.id)}>{campaign.id}</Table.Cell>
        <Table.Cell className='monoFont' style={{ cursor: creativesCount && 'pointer' }} onClick={() => creativesCount && onOpen('c-' + campaign.id)}>
          {(campaign && campaign.countries && campaign.countries.length > 0) && campaign.countries.map(countryCode => (<Flag key={'countryCode-' + countryCode} name={countryCode.toLowerCase()} />))}
          {creativesCount ? <b>{campaign.name}</b> : campaign.name}
        </Table.Cell>
        <Table.Cell className='tar monoFont'>{roundFixedView(campaign.impressions / 1000, 3)}</Table.Cell>
        <Table.Cell className='tar monoFont'>{roundFixedView(campaign.clicks, 0)}</Table.Cell>
        <Table.Cell className='tar monoFont'>{roundFixedView(campaign.leads, 0)}</Table.Cell>
        <Table.Cell className='tar monoFont'>{roundFixedView(campaign.ctr, 2)}</Table.Cell>
        <Table.Cell className='tar monoFont'>{roundFixedView(campaign.cr, 2)}</Table.Cell>
        <Table.Cell className='tar monoFont'>{roundFixedView(campaign.price, 3)}</Table.Cell>
        <Table.Cell className='tar monoFont'>{roundFixedView(campaign.income, 3)}</Table.Cell>
        <Table.Cell className='tar monoFont' positive={campaign.revenue > 0} negative={campaign.revenue < 0}>{campaign.revenue > 0 ? '+' : ''}{roundFixedView(campaign.revenue, 3)}</Table.Cell>
        <Table.Cell className='tar monoFont' style={{ cursor: 'pointer' }} positive={campaign.roi > 0} negative={campaign.roi < 0} onClick={() => onSelect('c-' + campaign.id)}>{campaign.roi > 0 ? '+' : ''}{roundFixedView(campaign.roi, 2)}</Table.Cell>
      </Table.Row>
    );

    if (creativesCount && opened['c-' + campaign.id]) {
      orderBy(campaingsCreatives, sortProp[0], !!sortProp[1] ? 'asc' : 'desc').forEach(creative => {
        const creativeUrls = creative.urls.filter(urlData => urlData && (urlData.status === 1) && urlData.id && urlData.url);
        const imageUrl = api.getImageUrl(creative.image);
        $row.push(
          <Table.Row key={'campaign-' + campaign.id + '-creative-' + creative.id} warning={!creative.active || creative.pending} style={{ fontSize: '0.8em', textDecoration: !!(selected['b-' + creative.id]) ? 'line-through' : '' }}>
            <Table.Cell className='tac'>
              {(creative.pending) ? <Loader active inline size='mini'/>
                : ((creative.rejected) ? <Button color='red' style={{ margin: '0 5px 0 0', padding: '2px' }} size='tiny' icon='warning'/>
                  : <Checkbox slider disabled={!(campaign && campaign.active)}  checked={!!(campaign && campaign.active && creative.active)} onClick={() => (campaign && campaign.active && creative.active) ? creativePause(creative.id) : creativeRun(creative.id) } />
                )
              }
            </Table.Cell>
            <Table.Cell className='monoFont'>{'↳'}&thinsp;{creative.id}</Table.Cell>
            <Table.Cell className='monoFont'>
              <Popup position='right center' flowing hoverable trigger={<Button color='blue' style={{ margin: '0 5px 0 0', padding: '2px' }} size='tiny' icon='image' />}>
                <Comment.Group>
                  <Comment>
                    <Comment.Avatar href={imageUrl} title={imageUrl} alt={imageUrl} rel='noreferrer' target='_blank' src={imageUrl} />
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
              {creative.brandname}
            </Table.Cell>
            <Table.Cell className='tar monoFont'>{roundFixedView(creative.impressions / 1000, 3)}</Table.Cell>
            <Table.Cell className='tar monoFont'>{roundFixedView(creative.clicks, 0)}</Table.Cell>
            <Table.Cell className='tar monoFont'>{roundFixedView(creative.leads, 0)}</Table.Cell>
            <Table.Cell className='tar monoFont'>{roundFixedView(creative.ctr, 2)}</Table.Cell>
            <Table.Cell className='tar monoFont'>{roundFixedView(creative.cr, 2)}</Table.Cell>
            <Table.Cell className='tar monoFont'>{roundFixedView(creative.price, 3)}</Table.Cell>
            <Table.Cell className='tar monoFont'>{roundFixedView(creative.income, 3)}</Table.Cell>
            <Table.Cell className='tar monoFont' positive={creative.revenue > 0} negative={creative.revenue < 0}>{creative.revenue > 0 ? '+' : ''}{roundFixedView(creative.revenue, 3)}</Table.Cell>
            <Table.Cell className='tar monoFont' style={{ cursor: 'pointer' }} positive={creative.roi > 0} negative={creative.roi < 0} onClick={() => onSelect('b-' + creative.id)}>{creative.revenue > 0 ? '+' : ''}{roundFixedView(creative.roi, 2)}</Table.Cell>
          </Table.Row>
        );
      });
    }
    
    $rows.push($row);
  });

  totalStats.ctr      = calcStatsCtr(totalStats.impressions, totalStats.clicks);
  totalStats.cr       =  calcStatsCr(totalStats.clicks, totalStats.leads);
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
                        { key: 'active-all', text: 'Active All', value: 'active-all' },
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
              <TableHeaderCell sort={sortProp} onSort={onSort} style={{ width: '50px' }} prop='active' title='Active'/>
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
          <Table.Body>{orderBy(rowsSortIndex, sortProp[0], !!sortProp[1] ? 'asc' : 'desc').map(item => $rows[item.campaignIndex])}</Table.Body>
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

export default Campaigns;
