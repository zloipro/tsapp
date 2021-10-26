import React, { useState, useEffect } from 'react';
import round from 'lodash/round';
import orderBy from 'lodash/orderBy';
import store from 'store';
import Moment from 'moment';
import { extendMoment } from 'moment-range';
import { Segment, Button, Table, Popup, Checkbox, Loader, Comment, Menu, Icon, Input, Dropdown, Flag } from 'semantic-ui-react';
import { DateInput } from 'semantic-ui-calendar-react';
import { dataIndex, saveStore } from '../../store';
import api  from '../../api';
import {
  DATE_FORMAT,
  roundFixedView, TableHeaderCell,
  calcStatsCtr, calcStatsCr, calcStatsEcpc, calcStatsEcpa, calcStatsRevenue, calcStatsRoi,
} from '../../utils';
import './style.scss';
const moment = extendMoment(Moment);


function Conversions(props) {
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
  const storeConversionsFilter = store.get('tsapp.conversions.filter') || {};
  const [sortProp, setSortProp] = useState([storeConversionsFilter['sortProp'] || 'cr', storeConversionsFilter['sortValue'] || false]);
  const [filterState, setFilterState] = useState('all');

  function loadData(fullLoad = false) {
    setLoading(true);
    (!!fullLoad
      ? Promise.all([
          api.getCampaignsAndCreatives(auth.token),
          api.getConversions(auth.apiKey, 142387),
        ])
      : api.getConversions(auth.apiKey, 142387)
    )
      .then(function () {
        const urls = Object.entries(dataIndex.urls).map(([id, url]) => url);
        if (urls.length) {
          // console.log(statsIndex);
          saveStore();
        }
        setState({
          rows: urls,
          rowsCount: urls.length,
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
    if (loading || loadingError || !(auth && auth.token && auth.apiKey)) {
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

  const rowsSortIndex = [];
  const $rows = [];

  state.rows.forEach(conversion => {
    console.log('conversion', conversion);
  });

  return (
    <>
      {loadingError && <Segment inverted color='red' onClick={() => setLoadingError(null)}>
        <Button onClick={() => setLoadingError(null)} floated='right' color='red' icon='close' size='tiny' style={{ marginTop: '-6px' }}/>
        <p>{loadingError}</p>
      </Segment>}
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
              <TableHeaderCell sort={sortProp} onSort={onSort} prop='id' title='ID'/>
            </Table.Row> 
          </Table.Header>
          <Table.Body>{orderBy(rowsSortIndex, sortProp[0], !!sortProp[1] ? 'asc' : 'desc').map(item => $rows[item.bannerIndex])}</Table.Body>
          <Table.Footer>
            <Table.Row>
              <Table.HeaderCell>Count: {rowsSortIndex.length}</Table.HeaderCell>
            </Table.Row>
          </Table.Footer>
        </Table>
      </Segment>
    </>
  );
}

export default Conversions;
