import '@testing-library/jest-dom'

import { webcrypto } from 'crypto'

if (!global.crypto) {
  global.crypto = webcrypto as Crypto
}

if (!global.crypto.getRandomValues) {
  global.crypto.getRandomValues = webcrypto.getRandomValues as typeof global.crypto.getRandomValues
}