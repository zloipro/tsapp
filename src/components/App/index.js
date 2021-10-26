// import Promise from 'bluebird';
import React, { useState, useEffect } from 'react';
import round from 'lodash/round';
import store from 'store';
import Moment from 'moment';
import { extendMoment } from 'moment-range';
import { Container, Segment, Button, Menu, Checkbox, Modal, Form, Input, Icon, Tab } from 'semantic-ui-react';
import { DATE_FORMAT }  from '../../utils';
import api  from '../../api';
import './style.scss';
import Campaigns from '../Campaigns';
import Banners from '../Banners';
// import Conversions from '../Conversions';
const moment = extendMoment(Moment);


function App() {
  const now = Date.now();
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authModal, setAuthModal] = useState(false);
  const [useLocalStore, setUseLocalStore] = useState(true);
  const [switchStamp, setViewSwitchStamp] = useState(0);
  const [viewSelect, setViewSelect] = useState('campaigns');
  const [auth, setAuth] = useState(store.get('tsapp.auth') || {});
  const [dates, setDates] = useState({
    from: moment().format(DATE_FORMAT),
    to:   moment().format(DATE_FORMAT),
  });
  const [searchQuery, setSearchQuery] = useState('');

  function onAuth() {
    if (!(auth.clientId && auth.clientSecret && auth.login && auth.password)) {
      setAuth({
        ...auth,
        tokenRefresh: '',
      });
      return null;
    }
    setLoading(true);
    api.auth(auth.clientId, auth.clientSecret, auth.login, auth.password)
      .then((data) => {
        const authData = { ...auth, ...data };
        if (useLocalStore) {
          store.set('tsapp.auth', authData);
        }
        setAuth(authData);
        if (authData.token) {
          setAuthModal(false);
        }
        setLoading(false);
      })
      .catch(function (error) {
        setAuth({
          ...auth,
          tokenRefresh: '',
        });
        setAuthError(error.toString());
        setLoading(false);
      });
  }

  function onAuthRefresh() {
    if (!(auth.clientId && auth.clientSecret && auth.tokenRefresh)) {
      return null;
    }
    setLoading(true);
    api.authRefresh(auth.clientId, auth.clientSecret, auth.tokenRefresh)
      .then((data) => {
        const authData = { ...auth, ...data };
        if (useLocalStore) {
          store.set('tsapp.auth', authData);
        }
        setAuth(authData);
        setLoading(false);
      })
      .catch(function (error) {
        setAuth({
          ...auth,
          token:        '',
          tokenRefresh: '',
          ttl:          0,
        });
        setAuthError(error.toString());
        setLoading(false);
      });
  }

  useEffect(() => {
    if (loading || authError || loadingError) {
      return null;
    }
    if (!auth.token) {
      if (!authModal) {
        setAuthModal(true);
      }
      return null;
    }
  }, [loading,loadingError, auth, authError, authModal]);

  function inViewSelect(view) {
    setViewSwitchStamp(now);
    setViewSelect(view);
  }

  const tokenTtlSeconds = round((auth.ttl - now) / 1000);
  const tokenDuration = moment.duration(tokenTtlSeconds % 3600 > 0 ? tokenTtlSeconds : (tokenTtlSeconds - 1), 'seconds');
  const tokenDurationMinutes = tokenDuration.get('minutes');
  const tokenDurationText = tokenDuration.humanize(true);

  return (
    <>
      <Menu fluid attached='top' inverted style={{ borderRadius: '0' }}>
        <Menu.Item header>TSapp</Menu.Item>
        <Menu.Item><Icon color={tokenDurationMinutes >= 30 ? 'green' : (tokenDurationMinutes >= 8 ? 'orange' : 'red') } name='key'/>expires {tokenDurationText}</Menu.Item>
        {(auth.clientId && auth.clientSecret && auth.tokenRefresh) && <Menu.Item disabled={loading} onClick={() => onAuthRefresh()}><Icon name='refresh' color={tokenDurationMinutes >= 8 ? null : 'green'}/>Refresh token</Menu.Item>}
        <Menu.Menu position='right'>
          <Menu.Item disabled={loading} active={viewSelect === 'campaigns'} onClick={() => inViewSelect('campaigns')}><Icon name='suitcase'/>Campaigns</Menu.Item>
          <Menu.Item disabled={loading} active={viewSelect === 'banners'} onClick={() => inViewSelect('banners')}><Icon name='picture'/>Banners</Menu.Item>
          {/* <Menu.Item disabled={loading} active={viewSelect === 'conversions'} onClick={() => inViewSelect('conversions')}><Icon name='dollar'/>Conversions</Menu.Item> */}
        </Menu.Menu>
      </Menu>

      <Container className='App' fluid style={{ padding: '25px 25px 55px 25px' }}>

        {loadingError && <Segment inverted color='red' onClick={() => setLoadingError(null)}>
          <Button onClick={() => setLoadingError(null)} floated='right' color='red' icon='close' size='tiny' style={{ marginTop: '-6px' }}/>
          <p>{loadingError}</p>
        </Segment>}

        {(viewSelect === 'campaigns') && (
          <Campaigns switchStamp={switchStamp} auth={auth} dates={dates} setDates={setDates} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        )}
        {(viewSelect === 'banners') && (
          <Banners switchStamp={switchStamp} auth={auth} dates={dates} setDates={setDates} searchQuery={searchQuery} setSearchQuery={setSearchQuery}/>
        )}
        {/* {(viewSelect === 'conversions') && (
          <Conversions switchStamp={switchStamp} auth={auth} dates={dates} setDates={setDates} searchQuery={searchQuery} setSearchQuery={setSearchQuery}/>
        )} */}

      </Container>

      <Modal open={authModal}>
        <Modal.Header>Auth</Modal.Header>
        <Modal.Content>
          {authError && <Segment inverted color='red' onClick={() => setAuthError(null)}>
            <Button onClick={() => setAuthError(null)} floated='right' color='red' icon='close' size='tiny' style={{ marginTop: '-6px' }}/>
            <p>{authError}</p>
          </Segment>}
          <Tab panes={[
            { menuItem: 'TrafficStars', render: () => (
              <Tab.Pane>
                <Form>
                  <Form.Field>
                    <label>Client ID</label>
                    <Input placeholder='TS client ID' value={auth.clientId || ''} onChange={v => setAuth({ ...auth, clientId: v.target.value  })} />
                  </Form.Field>
                  <Form.Field>
                    <label>Client Secret</label>
                    <Input placeholder='TS client Secret' value={auth.clientSecret || ''} onChange={v => setAuth({ ...auth, clientSecret: v.target.value  })} />
                  </Form.Field>
                  <Form.Field>
                    <label>Login</label>
                    <Input placeholder='Login' value={auth.login || ''} onChange={v => setAuth({ ...auth, login: v.target.value  })} />
                  </Form.Field>
                  <Form.Field>
                    <label>Password</label>
                    <Input type='password' placeholder='Password' value={auth.password || ''} onChange={v => setAuth({ ...auth, password: v.target.value  })} />
                  </Form.Field>
                </Form>
              </Tab.Pane>
            )},
            { menuItem: 'ClickDealer', disabled: true, render: () => (
              <Tab.Pane>
                <Form>
                  <Form.Field>
                    <label>Api Key</label>
                    <Input placeholder='CD api Key' disabled value={auth.apiKey || ''} onChange={v => setAuth({ ...auth, apiKey: v.target.value  })} />
                  </Form.Field>
                </Form>
              </Tab.Pane>
            )},
          ]}/>
          <br/>
          <Form>
            <Form.Field>
              <Checkbox checked={!!useLocalStore} onChange={() => setUseLocalStore(!useLocalStore)} label='Save credentials in local storage' />
            </Form.Field>
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button type='submit' color='green' onClick={() => onAuth()}>Auth</Button>
        </Modal.Actions>
      </Modal>
    </>
  );
}

export default App;
