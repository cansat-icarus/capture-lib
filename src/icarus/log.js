import { default as bunyan, RingBuffer } from 'bunyan'

function getBunyanDBStream(db) {
  const buffer = new RingBuffer({ limit: 50 })

  return [buffer, {
    write: obj => {
      // error and fatal want more information
      if(obj.level > 45) obj._context = buffer.records

      // save to db
      db.post(obj)
    }
  }]
}

export default function createLogger(name, db) {
  const [bufferStream, dbStream] = getBunyanDBStream(db)

  return bunyan.createLogger({
    name: `CanSatGS-${name}`,
    streams: [
      {
        level: 'trace',
        stream: process.stdout
      },
      {
        level: 'debug',
        type: 'rotating-file',
        path: `CanSatGS-${name}.log`,
        period: '3h', // New log file at every 3h
        count: 10 // Keep 10 log files
      },
      {
        level: 'trace',
        type: 'raw',
        stream: bufferStream
      },
      {
        level: 'info',
        type: 'raw',
        stream: dbStream
      }
    ]
  })
}
