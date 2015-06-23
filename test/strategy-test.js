var should       = require('chai').Should(),
    ADStrategy   = require('passport-adauth'),
    request      = require('supertest'),
    ldapserver   = require('./ldapserver'),
    appserver    = require('./appserver');

var LDAP_PORT = 1389;

var expressapp = null;

// Base options that are cloned where needed to edit
var BASE_OPTS = {
  server: {
    url: 'ldap://localhost:' +  LDAP_PORT.toString(),
    domainDn: 'DC=example,DC=com',
    bindDn: 'CN=LDAP User,OU=Users,OU=MyBusiness,DC=example,DC=com',
    bindCredentials: 'mypassword',
    searchBase: 'OU=Users,OU=MyBusiness,DC=example,DC=com'
  }
},
BASE_TEST_OPTS = {
  no_callback: false
};

var start_servers = function (opts, test_opts) {
  return function (cb) {
    ldapserver.start(LDAP_PORT, function () {
      appserver.start(opts, test_opts, function (app) {
        expressapp = app;
        cb();
      });
    });
  }
}

var stop_servers = function (cb) {
  appserver.close(function () {
    ldapserver.close(function () {
      cb();
    });
  });
};

describe("AD authentication strategy", function () {

  describe("by itself", function () {

    it("should export Strategy constructor directly", function (cb) {
      require('passport-adauth').should.be.a('function');
      cb();
    });

    it("should export Strategy constructor separately as well", function (cb) {
      var strategy = require('passport-adauth').Strategy;
      strategy.should.be.a('function');
      (function () {
        new strategy(BASE_OPTS);
      }).should.not.throw(Error);
      cb();
    });

    it("should be named adauth", function (cb) {
      var s = new ADStrategy(BASE_OPTS);
      s.name.should.equal('adauth');
      cb();
    });

    it("should throw an error if no arguments are provided", function (cb) {
      (function () {
        new ADStrategy();
      }).should.throw(Error);
      cb();
    });

    it("should throw an error if options are not accepted by adauth",
    function (cb) {
      var s = new ADStrategy({}, function () {});
      (function () {
        s.authenticate({body: {username: 'valid', password: 'valid'}});
      }).should.throw(Error);
      cb();
    });

    it("should initialize without a verify callback", function (cb) {
      (function () {
        new ADStrategy({server: {}})
      }).should.not.throw(Error);
      cb();
    });

  });

  describe("with basic settings", function () {

    before(start_servers(BASE_OPTS, BASE_TEST_OPTS));

    after(stop_servers);

    it("should return unauthorized if credentials are not given",
    function (cb) {
      request(expressapp)
        .post('/login')
        .send({})
        .expect(400)
        .end(cb);
    });

    it("should allow access with valid credentials", function (cb) {
      request(expressapp)
        .post('/login')
        .send({username: 'valid@example.com', password: 'validpassword'})
        .expect(200)
        .end(cb);
    });

    it("should allow access with valid credentials in query string",
    function (cb) {
      request(expressapp)
        .post('/login?username=valid@example.com&password=validpassword')
        .expect(200)
        .end(cb);
    });

    it("should return unauthorized with invalid credentials", function (cb) {
      request(expressapp)
        .post('/login')
        .send({username: 'valid@example.com', password: 'invvalid'})
        .expect(401)
        .end(cb);
    });

    it("should return unauthorized with non-existing user", function (cb) {
      request(expressapp)
        .post('/login')
        .send({username: 'nonexisting', password: 'invvalid'})
        .expect(401)
        .end(cb);
    });

    it("should return groups for user", function (cb) {
      start_servers(BASE_OPTS, BASE_TEST_OPTS)(function () {
        var req = { body: {
          username: 'valid@example.com',
          password: 'validpassword'
        } },
            s   = new ADStrategy(BASE_OPTS, function (user, done) {
              req.should.have.keys('body');
              req.body.should.have.keys(['username', 'password']);
              done(null, user);
            });

        s.success = function (user) {
          should.exist(user);
          user.userPrincipalName.should.equal('valid@example.com');
          user._groups.length.should.equal(3);
          user._groups[0].name.should.equal('Group 1');
          user._groups[1].name.should.equal('Group 2');
          user._groups[2].name.should.equal('Group 3');
          cb();
        };

        s.authenticate(req);
      });
    });
  });

  describe("without a verify callback", function () {
    before(start_servers(BASE_OPTS, {no_callback: true}));

    after(stop_servers);

    it("should still authenticate", function (cb) {
      request(expressapp)
        .post('/login')
        .send({username: 'valid@example.com', password: 'validpassword'})
        .expect(200)
        .end(cb);
    });

    it("should reject invalid event", function (cb) {
      request(expressapp)
        .post('/login')
        .send({username: 'valid@example.com', password: 'invalid'})
        .expect(401)
        .end(cb);
    });
  });

  describe("with optional options", function () {

    afterEach(stop_servers);

    it("should read given fields instead of defaults", function (cb) {
      var OPTS = JSON.parse(JSON.stringify(BASE_OPTS));
      OPTS.usernameField = 'ldapuname';
      OPTS.passwordField = 'ldappwd';

      start_servers(OPTS, BASE_TEST_OPTS)(function () {
        request(expressapp)
          .post('/login')
          .send({ldapuname: 'valid@example.com', ldappwd: 'validpassword'})
          .expect(200)
          .end(cb);
      });
    });

    it("should pass request to verify callback if defined so", function (cb) {
      var OPTS = JSON.parse(JSON.stringify(BASE_OPTS));
      OPTS.passReqToCallback = true;

      start_servers(OPTS, BASE_TEST_OPTS)(function () {
        var req = { body: {
          username: 'valid@example.com',
          password: 'validpassword',
          testkey: 1
        } },
            s   = new ADStrategy(OPTS, function (req, user, done) {
              req.should.have.keys('body');
              req.body.should.have.keys(['username', 'password', 'testkey']);
              done(null, user);
            });

        s.success = function (user) {
          should.exist(user);
          user.userPrincipalName.should.equal('valid@example.com');
          cb();
        };

        s.authenticate(req);
      });
    });
  });

  describe("with options as function", function () {
    var OPTS = JSON.parse(JSON.stringify(BASE_OPTS));
    OPTS.usernameField = 'cb_uname';
    OPTS.passwordField = 'cb_pwd';

    var opts = function (cb) {
      process.nextTick(function () {
        cb(null, OPTS);
      });
    };

    before(start_servers(opts, BASE_TEST_OPTS));
    after(stop_servers);

    it("should use the options returned from the function", function (cb) {
      request(expressapp)
        .post('/login')
        .send({cb_uname: 'valid@example.com', cb_pwd: 'validpassword'})
        .expect(200)
        .end(cb);
    });

    it("should not allow login if using wrong fields", function (cb) {
      request(expressapp)
        .post('/login')
        .send({username: 'valid@example.com', password: 'validpassword'})
        .expect(400)
        .end(cb);
    });
  });

  describe("with options as function returning dynamic sets", function () {
    var OPTS = JSON.parse(JSON.stringify(BASE_OPTS));
    OPTS.usernameField = 'first_uname';
    OPTS.passwordField = 'first_pwd';

    var OPTS2 = JSON.parse(JSON.stringify(BASE_OPTS));
    OPTS2.usernameField = 'second_uname';
    OPTS2.passwordField = 'second_pwd';

    var opts = function (req, cb) {
      process.nextTick(function () {
        if (req.body.set == 'first') {
          cb(null, OPTS);
        } else {
          cb(null, OPTS2);
        }
      });
    };

    before(start_servers(opts, BASE_TEST_OPTS));
    after(stop_servers);

    it("should use the first set options returned from the function",
    function (cb) {
      request(expressapp)
        .post('/login')
        .send({
          first_uname: 'valid@example.com',
          first_pwd: 'validpassword',
          set: 'first'
        })
        .expect(200)
        .end(cb);
    });

    it("should not allow first set login if using wrong fields", function (cb) {
      request(expressapp)
        .post('/login')
        .send({
          second_uname: 'valid@example.com',
          second_pwd: 'validpassword',
          set: 'first'
        })
        .expect(400)
        .end(cb);
    });

    it("should use the second set options returned from the function",
    function (cb) {
      request(expressapp)
        .post('/login')
        .send({
          second_uname: 'valid@example.com',
          second_pwd: 'validpassword',
          set: 'second'
        })
        .expect(200)
        .end(cb);
    });

    it("should not allow second set login if using wrong fields",
    function (cb) {
      request(expressapp)
        .post('/login')
        .send({
          first_uname: 'valid@example.com',
          first_pwd: 'validpassword',
          set: 'second'
        })
        .expect(400)
        .end(cb);
    });
  });
});
