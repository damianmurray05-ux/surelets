import { test } from "node:test";
import assert from "node:assert/strict";
import { mapRecord, normalisePhone, normaliseRef, zohoConfigured } from "../src/chat/zoho.mjs";

// A made-up tenancy in the shape the CRM returns. Never paste a real record
// here: this repository is public. The phone number is from Ofcom's range
// reserved for drama and tests, and the postcode does not exist.
const rec = {
  id: "0000000000000000001",
  Status: "Tenanted",
  Email: "tenant@example.com",
  Tenant_1_Name: "Alex Sample Tenant",
  Tenant_1_Phone: "07700900123",
  Rent_Payment_Reference: "ZZ991ZZFLAT9",
  Last_Name: "9 Example House, Sample Road - Alex Sample Tenant",
  Account_Name: { name: "9 Example House, Sample Road, Testtown, ZZ99 1ZZ", id: "1" },
};

test("phone numbers become E.164", () => {
  assert.equal(normalisePhone("07700 900 123"), "+447700900123");
  assert.equal(normalisePhone("+44 7700 900123"), "+447700900123");
  assert.equal(normalisePhone("0044 7700900123"), "+447700900123");
  assert.equal(normalisePhone(""), "");
});

test("references are compared without punctuation or case", () => {
  assert.equal(normaliseRef(" zz99-1zz flat 9 "), "ZZ991ZZFLAT9");
});

test("a CRM tenancy maps to name, property, contact details and currency", () => {
  const t = mapRecord(rec);
  assert.equal(t.firstName, "Alex");
  assert.equal(t.address, "9 Example House, Sample Road, Testtown, ZZ99 1ZZ");
  assert.equal(t.phone, "+447700900123");
  assert.equal(t.reference, "ZZ991ZZFLAT9");
  assert.equal(t.current, true);
});

test("ended tenancies and X-marked records are not current", () => {
  assert.equal(mapRecord({ ...rec, Status: "Vacated" }).current, false);
  assert.equal(mapRecord({ ...rec, Last_Name: "X 9 Example House - Old Tenant" }).current, false);
  assert.equal(mapRecord({ ...rec, Account_Name: null }).address, "9 Example House, Sample Road");
});

test("a record with no usable name or contact details still maps safely", () => {
  const t = mapRecord({ id: "2", Status: "Tenanted", Last_Name: "", Rent_Payment_Reference: "ZZ991ZZFLAT8" });
  assert.equal(t.firstName, "there");
  assert.equal(t.email, "");
  assert.equal(t.phone, "");
  assert.equal(t.current, true);
});

test("zoho is off until all three keys exist", () => {
  assert.equal(zohoConfigured(), false);
});
