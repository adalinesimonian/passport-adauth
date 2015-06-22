var ldap = require('ldapjs');

var authorize = function (req, res, next) {
  return next();
};

var server = null;

var db = {
  valid: {
    dn: 'CN=Valid User,OU=Users,OU=MyBusiness,DC=example,DC=com',
    attributes:  {
      userPrincipalName: 'valid@example.com',
      samAccountName: 'valid',
      primaryGroupID: 83958793,
      objectSid: [0x01,0x05,0x00,0x00,0x00,0x00,0x00,0x05,0x15,0x00,0x00,0x00,
                  0xA0,0x65,0xCF,0x7E,0x78,0x4B,0x9B,0x5F,0xE7,0x7C,0x87,0x70,
                  0x09,0x1C,0x01,0x00],
      memberOf: [
        'CN=Group 2,OU=Groups,OU=MyBusiness,DC=example,DC=com'
      ],
      objectClass: [ 'user' ],
      objectCategory: [ 'user' ]
    }
  },
  group1: {
    dn: 'CN=Group 1,OU=Groups,OU=MyBusiness,DC=example,DC=com',
    attributes: {
      name: 'Group 1',
      objectSid: [0x01,0x05,0x00,0x00,0x00,0x00,0x00,0x05,0x15,0x00,0x00,0x00,
                  0xA0,0x65,0xCF,0x7E,0x78,0x4B,0x9B,0x5F,0xE7,0x7C,0x87,0x70,
                  0x09,0x1C,0x01,0x05],
      memberOf: [],
      member: [],
      objectClass: [ 'group' ],
      objectCategory: [ 'group' ]
    }
  },
  group2: {
    dn: 'CN=Group 2,OU=Groups,OU=MyBusiness,DC=example,DC=com',
    attributes: {
      name: 'Group 2',
      objectSid: [0x01,0x05,0x00,0x00,0x00,0x00,0x00,0x05,0x15,0x00,0x00,0x00,
                  0xA0,0x65,0xCF,0x7E,0x78,0x4B,0x9B,0x5F,0xE7,0x7C,0x87,0x70,
                  0x09,0x1C,0x01,0x10],
      memberOf: [
        'CN=Group 3,OU=Groups,OU=MyBusiness,DC=example,DC=com'
      ],
      objectClass: [ 'group' ],
      objectCategory: [ 'group' ],
      member: [
        'CN=Valid User,OU=Users,OU=MyBusiness,DC=example,DC=com'
      ]
    }
  },
  group3: {
    dn: 'CN=Group 3,OU=Groups,OU=MyBusiness,DC=example,DC=com',
    attributes: {
      name: 'Group 3',
      objectSid: [0x01,0x05,0x00,0x00,0x00,0x00,0x00,0x05,0x15,0x00,0x00,0x00,
                  0xA0,0x65,0xCF,0x7E,0x78,0x4B,0x9B,0x5F,0xE7,0x7C,0x87,0x70,
                  0x09,0x1C,0x01,0x0F],
      objectClass: [ 'group' ],
      objectCategory: [ 'group' ],
      memberOf: [],
      member: [
        'CN=Group 2,OU=Groups,OU=MyBusiness,DC=example,DC=com'
      ]
    }
  }
};

exports.start = function (port, cb) {
  if (server) {
    if (typeof (cb) === 'function') return cb();
    return;
  }

  server = ldap.createServer({ strictDN: false });

  server.bind('', function(req, res, next) {
    var dn = req.dn.toString();
    if (dn !== db.valid.attributes.userPrincipalName ||
        req.credentials !== 'validpassword') {
      return next(new ldap.InvalidCredentialsError());
    }
    res.end();
  });

  server.search('', function(req, res, next) {
    var filter = req.filter.filters ?
      req.filter.filters[req.filter.filters.length - 1] : req.filter;
    if (filter.matches(db.valid.attributes)) {
      res.send(db.valid);
    } else if (filter.attribute.toLowerCase() === 'objectsid' &&
      filter.value === 'S-1-5-21-2127521184-1604012920-1887927527-83958793') {
      res.send(db.group1);
    } else if (filter.attribute.toLowerCase() === 'member' &&
      ldap.parseDN(filter.value).equals(ldap.parseDN(db.valid.dn))) {
      res.send(db.group2);
    } else if (filter.attribute.toLowerCase() === 'member' &&
      ldap.parseDN(filter.value).equals(ldap.parseDN(db.group2.dn))) {
      res.send(db.group3);
    }
    res.end();
  });

  server.listen(port, function () {
    if (typeof (cb) === 'function') return cb();
  });
};

exports.close = function (cb) {
  if (server) server.close();
  server = null;
  if (typeof (cb) === 'function') return cb();
  return;
};

if (!module.parent) {
  exports.start(1389);
}
