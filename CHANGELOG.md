# Change log

## 0.1.2
### Changed
- Recommended passing CA certificate URL directly to node-adauth instead of
  using `fs.readFileSync(...)`

## 0.1.1
### Fixed
- Test in which a typo prevented it from passing

### Removed
- node 0.8 from Travis test profiles, which used an old version of npm that
  would not properly resolve the caret `^` in dependency versions
  
### Changed
- Depends on `adauth` 0.1.2 now, which returns `objectGUID` attributes in a
  string format instead of as a `Buffer` object

## 0.1.0
First working version after being forked from passport-ldapauth

### Changed
- Switched to using `adauth` instead of `ldapauth`
- Unit tests modified to create an Active Directory-like environment