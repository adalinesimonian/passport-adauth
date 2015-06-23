# passport-adauth

[Passport](http://passportjs.org/) authentication strategy against Active
Directory. This module is a Passport strategy wrapper for [adauth](
https://github.com/vsimonian/node-adauth).

## Install

    $ npm install passport-adauth

## Status

[![Build Status](https://travis-ci.org/vsimonian/passport-adauth.png)](
https://travis-ci.org/vsimonian/passport-adauth)
[![Dependency Status](https://gemnasium.com/vsimonian/passport-adauth.png)](
https://gemnasium.com/vsimonian/passport-adauth)

## License

MIT. See "LICENSE" file.

## Usage

```javascript
var ADStrategy = require('passport-adauth');

passport.use(new ADStrategy({
  server: {
    url: 'ldaps://corp.example.com',
    domainDn: 'dc=example,dc=com',
    tlsOptions: {
      ca: './domain-ca.cer'
    }
  }
}));
```

* `server`: LDAP settings. These are passed directly to [adauth](
  https://github.com/vsimonian/node-adauth). See its documentation for all
  available options.
    * `url`: The LDAP URL for the domain controller e.g.
      `ldaps://corp.example.com:636`
    * `bindDn`: A user with just enough permissions to read other users'
      attributes e.g. `CN=LDAP User,OU=Users,OU=MyBusiness,DC=example,DC=com`
    * `bindCredentials`: Password for bindDn
    * `searchBase`: The base suffix for all users to narrow results e.g.
      `OU=Users,OU=MyBusiness,DC=example,DC=com`
    * `searchAttributes`: Optional array of attributes to limit what attributes
      are fetched from AD, e.g. `['displayName', 'mail']`. Defaults to
      `undefined`, i.e. fetch all attributes
    * `tlsOptions`: Optional object with options accepted by the Node.js [tls](
      http://nodejs.org/api/tls.html#tls_tls_connect_options_callback) module.
* `usernameField`: Field name where the username is found, defaults to
  _username_
* `passwordField`: Field name where the password is found, defaults to
  _password_
* `passReqToCallback`: When `true`, `req` is the first argument to the verify
  callback (default: `false`):

```js
passport.use(new ADStrategy(..., function(req, user, done) {
    ...
    done(null, user);
  }
));
```

Note: you can pass a function instead of an object as `options`, see the
[example below](#options-as-function)

### Authenticate requests

Use `passport.authenticate()`, specifying the `'adauth'` strategy, to
authenticate requests.

#### `authenticate()` options

In addition to [default authentication options](
http://passportjs.org/guide/authenticate/) the following options are available
for `passport.authenticate()`:

 * `badRequestMessage`  flash message for missing username/password (default:
   'Missing credentials')
 * `invalidCredentials`  flash message for `InvalidCredentialsError`,
   `NoSuchObjectError`, and `/no such user/i` LDAP errors (default: 'Invalid
   username/password')
 * `userNotFound`  flash message when AD returns no error but also no user
   (default: 'Invalid username/password')
 * `constraintViolation`  flash message when user account is locked (default:
   'Exceeded password retry limit, account locked')

## Express example

```javascript
var express      = require('express'),
    passport     = require('passport'),
    bodyParser   = require('body-parser'),
    ADStrategy   = require('passport-adauth');

var adOptions = {
  server: {
    url: 'ldap://corp.example.com',
    bindDn: 'CN=LDAP User,OU=Users,OU=MyBusiness,DC=example,DC=com',
    bindCredentials: 'mypassword',
    searchBase: 'OU=Users,OU=MyBusiness,DC=example,DC=com'
  }
};

var app = express();

passport.use(new ADStrategy(adOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());

app.post('/login', passport.authenticate('adauth', { session: false }),
function(req, res) {
  res.send({ status: 'ok' });
});

app.listen(8080);
```

### Active Directory over SSL example

Simple example config for connecting over `ldaps://` to a server requiring some
internal CA certificate (often the case in corporations using Windows AD).

```javascript
var opts = {
  server: {
    url: 'ldaps://corp.example.com:636',
    bindDn: 'CN=LDAP User,OU=Users,OU=MyBusiness,DC=example,DC=com',
    bindCredentials: 'mypassword',
    searchBase: 'OU=Users,OU=MyBusiness,DC=example,DC=com'
    tlsOptions: {
      ca: './domain-ca.cer'
    }
  }
};
...
```

<a name="options-as-function"></a>
## Asynchronous configuration retrieval

Instead of providing a static configuration object, you can pass a function as
`options` that will take care of fetching the configuration. It will be called'
with the `req` object and a callback function having the standard `(err,
result)` signature. Notice that the provided function will be called on every
authenticate request.

```javascript
var getLDAPConfiguration = function(req, callback) {
  // Fetching things from database or whatever
  process.nextTick(function() {
    var opts = {
      server: {
        url: 'ldap://corp.example.com',
        bindDn: 'CN=LDAP User,OU=Users,OU=MyBusiness,DC=example,DC=com',
        bindCredentials: 'mypassword',
        searchBase: 'OU=Users,OU=MyBusiness,DC=example,DC=com'
      }
    };

    callback(null, opts);
  });
};

var ADStrategy = require('passport-adauth');

passport.use(new ADStrategy(getLDAPConfiguration,
  function(user, done) {
    ...
    return done(null, user);
  }
));
```
