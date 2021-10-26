import React from 'react';
import isNumber from 'lodash/isNumber';
import { Statistic, Placeholder } from 'semantic-ui-react';
import './style.scss';


function Statistics(props) {
  const { stats } = props;

  if (!stats) {
    return (
      <div style={{ textAlign: 'center' }}>
        <Placeholder fluid>
          <Placeholder.Paragraph>
            <Placeholder.Line />
            <Placeholder.Line />
            <Placeholder.Line />
            <Placeholder.Line />
          </Placeholder.Paragraph>
        </Placeholder>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {isNumber(stats.impressions) && <Statistic size='mini' style={{ marginRight: '20px' }}>
        <Statistic.Value>{stats.impressions.toLocaleString()}</Statistic.Value>
        <Statistic.Label>Impressions</Statistic.Label>
      </Statistic>}
      {isNumber(stats.clicks) && <Statistic size='mini' style={{ marginRight: '20px' }}>
        <Statistic.Value>{stats.clicks.toLocaleString()}</Statistic.Value>
        <Statistic.Label>Clicks</Statistic.Label>
      </Statistic>}
      {isNumber(stats.leads) && <Statistic size='mini' style={{ marginRight: '20px' }}>
        <Statistic.Value>{stats.leads.toLocaleString()}</Statistic.Value>
        <Statistic.Label>Leads</Statistic.Label>
      </Statistic>}
      {isNumber(stats.ctr) && <Statistic size='mini' style={{ marginRight: '20px' }}>
        <Statistic.Value>{stats.ctr.toFixed(3)}%</Statistic.Value>
        <Statistic.Label>CTR</Statistic.Label>
      </Statistic>}
      {isNumber(stats.cr) && <Statistic size='mini' style={{ marginRight: '20px' }}>
        <Statistic.Value>{stats.cr.toFixed(3)}%</Statistic.Value>
        <Statistic.Label>CR</Statistic.Label>
      </Statistic>}
      {isNumber(stats.ecpc) && <Statistic size='mini' style={{ marginRight: '20px' }}>
        <Statistic.Value>{stats.ecpc.toFixed(3)}$</Statistic.Value>
        <Statistic.Label>ECPC</Statistic.Label>
      </Statistic>}
      {isNumber(stats.ecpa) && <Statistic size='mini' style={{ marginRight: '20px' }}>
        <Statistic.Value>{stats.ecpa.toFixed(3)}$</Statistic.Value>
        <Statistic.Label>ECPA</Statistic.Label>
      </Statistic>}
      {isNumber(stats.price) && <Statistic size='mini' style={{ marginRight: '20px' }}>
        <Statistic.Value>{stats.price.toFixed(3).toLocaleString()}$</Statistic.Value>
        <Statistic.Label>Price</Statistic.Label>
      </Statistic>}
      {isNumber(stats.income) && <Statistic size='mini' style={{ marginRight: '20px' }} color={stats.income > 0 ? 'green' : 'red'}>
        <Statistic.Value>{stats.income.toFixed(3).toLocaleString()}$</Statistic.Value>
        <Statistic.Label>Income</Statistic.Label>
      </Statistic>}
      {isNumber(stats.revenue) && <Statistic size='mini' style={{ marginRight: '20px' }} color={stats.revenue > 0 ? 'green' : 'red'}>
        <Statistic.Value>{stats.revenue.toFixed(3).toLocaleString()}$</Statistic.Value>
        <Statistic.Label>Revenue</Statistic.Label>
      </Statistic>}
      {isNumber(stats.roi) && <Statistic size='mini' color={stats.roi > 16 ? 'green' : (stats.roi > 0 ? 'orange' : 'red')}>
        <Statistic.Value>{stats.roi.toFixed(3)}%</Statistic.Value>
        <Statistic.Label>ROI</Statistic.Label>
      </Statistic>}
    </div>
  );
}

export default Statistics;
