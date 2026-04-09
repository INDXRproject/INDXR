import * as fs from 'fs'
import * as path from 'path'

interface RawAccount {
  email: string
  user_id: string
  credits: number
}

interface RawAccountFile {
  password: string
  accounts: RawAccount[]
}

export interface TestAccount {
  email: string
  password: string
  userId: string
  credits: number
  role: 'auto-captions' | 'whisper' | 'playlist' | 'stress'
}

const ROLES: TestAccount['role'][] = ['auto-captions', 'whisper', 'playlist', 'stress']

function loadAccounts(): TestAccount[] {
  const filePath = path.resolve(__dirname, '../../test_accounts.json')
  const raw: RawAccountFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

  return raw.accounts.map((a, i) => ({
    email: a.email,
    password: raw.password,
    userId: a.user_id,
    credits: a.credits,
    role: ROLES[i] ?? 'stress',
  }))
}

const accounts = loadAccounts()

export const account1 = accounts[0]  // auto-captions tester
export const account2 = accounts[1]  // whisper tester
export const account3 = accounts[2]  // playlist tester
export const account4 = accounts[3]  // stress tester

export default accounts
