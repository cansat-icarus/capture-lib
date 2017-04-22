import test from 'ava'
import {default as getDB, getRemoteDB, __RewireAPI__} from '../../src/lib/db'
import normalizePath from '../../src/lib/path'

test.before(() => __RewireAPI__.__Rewire__('PouchDB', Array))

test.after.always(() => __RewireAPI__.__ResetDependency__('PouchDB'))

test.serial('get local databases', t => {
	const dbName = 'adatabase'
	const db = getDB(dbName)
	t.is(db[0], normalizePath(dbName))

	// TODO: split normalizePath test into some other place
	normalizePath.__Rewire__('pathPrefix', 'aprefix')
	const db2 = getDB(dbName)
	t.is(db2[0], normalizePath(dbName))
	normalizePath.__ResetDependency__('pathPrefix')
})

test('get local database as remote', t => {
	const dbName = 'adatabase'
	const user = 'user'
	const pass = 'pass'

	const db = getRemoteDB(dbName, user, pass)

	t.is(db[0], dbName)
	t.is(db[1].auth.username, user)
	t.is(db[1].auth.password, pass)
})

test('gets remote database (http empty port)', t => {
	const user = 'user'
	const pass = 'pass'

	const db = getRemoteDB('http://subdomain.dburl.tld/abc', user, pass)

	// URL should now include a port
	t.is(db[0], 'http://subdomain.dburl.tld:5984/abc')
	t.is(db[1].auth.username, user)
	t.is(db[1].auth.password, pass)
})

test('gets remote database (https empty port)', t => {
	const user = 'user'
	const pass = 'pass'

	const db = getRemoteDB('https://subdomain.dburl.tld/abc', user, pass)

	// URL should now include a port
	t.is(db[0], 'https://subdomain.dburl.tld:6984/abc')
	t.is(db[1].auth.username, user)
	t.is(db[1].auth.password, pass)
})

test('gets remote database (custom port)', t => {
	const user = 'user'
	const pass = 'pass'

	const db1 = getRemoteDB('http://subdomain.dburl.tld:1234/abc', user, pass)
	const db2 = getRemoteDB('https://subdomain.dburl.tld:1234/abc', user, pass)
	const db3 = getRemoteDB('sillyprotocol://subdomain.dburl.tld:1234/abc', user, pass)

	// URL should keep the specified port
	t.is(db1[0], 'http://subdomain.dburl.tld:1234/abc')
	t.is(db2[0], 'https://subdomain.dburl.tld:1234/abc')
	t.is(db3[0], 'sillyprotocol://subdomain.dburl.tld:1234/abc')
	t.is(db1[1].auth.username, user)
	t.is(db1[1].auth.password, pass)
	t.is(db2[1].auth.username, user)
	t.is(db2[1].auth.password, pass)
	t.is(db3[1].auth.username, user)
	t.is(db3[1].auth.password, pass)
})
