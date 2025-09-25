'use strict'
const MBS_STATE_INIT = 'State init'
const MBS_STATE_IDLE = 'State idle'
const MBS_STATE_GOOD_CONNECT = 'State good (port)'
const MBS_STATE_FAIL_CONNECT = 'State fail (port)'
const MBS_STATE_NEXT = 'State next'
const MBS_STATE_GOOD_READ = 'State good (read)'
const MBS_STATE_FAIL_READ = 'State fail (read)'
const MBS_STATE_WAIT_RECONNECT = 'State wait reconnect'
const mbsId = 1
const mbsPort = 502
const mbsTimeout = 5000
export {
  MBS_STATE_INIT,
  MBS_STATE_IDLE,
  MBS_STATE_GOOD_CONNECT,
  MBS_STATE_FAIL_CONNECT,
  MBS_STATE_NEXT,
  MBS_STATE_GOOD_READ,
  MBS_STATE_FAIL_READ,
  MBS_STATE_WAIT_RECONNECT,
  mbsId,
  mbsPort,
  mbsTimeout
}
