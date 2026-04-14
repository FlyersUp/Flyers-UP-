import { describe, it } from 'node:test';
import assert from 'node:assert';
import { scanMessageForOffPlatformSignals } from '../offPlatformMessageSignals';

describe('scanMessageForOffPlatformSignals', () => {
  it('returns null for normal coordination', () => {
    assert.equal(scanMessageForOffPlatformSignals('See you Tuesday at 9.').signal, null);
  });

  it('detects third-party payment apps', () => {
    assert.equal(
      scanMessageForOffPlatformSignals('Just venmo me when you arrive').signal,
      'third_party_payment_app'
    );
  });

  it('detects off-platform payment phrasing', () => {
    assert.equal(
      scanMessageForOffPlatformSignals('You can pay me directly outside the app').signal,
      'direct_or_off_platform_payment'
    );
  });

  it('detects external coordination handles', () => {
    assert.equal(
      scanMessageForOffPlatformSignals('Text me on whatsapp for faster replies').signal,
      'external_coordination'
    );
  });
});
