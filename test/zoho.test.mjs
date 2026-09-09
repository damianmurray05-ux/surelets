import { test } from "node:test";
import assert from "node:assert/strict";
import { mapRecord, normalisePhone, normaliseRef, zohoConfigured } from "../src/chat/zoho.mjs";

const rec = {
  id: "2406742000081586011",
  Status: "Tenanted",
  Email: "tenant@example.com",
  Tenant_1_Name: "Ross Marc Lewis Mccabe",
  Tenant_1_Phone: "07704573420",
  Rent_Payment_Reference: "NE236UNFLAT44",
  Last_Name: "44 Lancaster House, Brownrigg Drive - Ross Mark Lewis Mccabe",
  Account_Name: { name: "44 Lancaster House, Brownrigg Drive, Cramlington, NE23 6UN", id: "1" },
};

test("phone numbers become E.164", () => {
  assert.equal(normalisePhone("07704 573 420"), "+447704573420");
  assert.equal(normalisePhone("+44 7704 573420"), "+447704573420");
  assert.equal(normalisePhone("0044 7704573420"), "+447704573420");
  assert.equal(normalisePhone(""), "");
});

test("references are compared without punctuation or case", () => {
  assert.equal(normaliseRef(" ne23-6un flat 44 "), "NE236UNFLAT44");
});

test("a CRM tenancy maps to name, property, contact details and currency", () => {
  const t = mapRecord(rec);
  assert.equal(t.firstName, "Ross");
  assert.equal(t.address, "44 Lancaster House, Brownrigg Drive, Cramlington, NE23 6UN");
  assert.equal(t.phone, "+447704573420");
  assert.equal(t.reference, "NE236UNFLAT44");
  assert.equal(t.current, true);
});

test("ended tenancies and X-marked records are not current", () => {
  assert.equal(mapRecord({ ...rec, Status: "Vacated" }).current, false);
  assert.equal(mapRecord({ ...rec, Last_Name: "X 44 Lancaster House - Old Tenant" }).current, false);
  assert.equal(mapRecord({ ...rec, Account_Name: null }).address, "44 Lancaster House, Brownrigg Drive");
});

test("zoho is off until all three keys exist", () => {
  assert.equal(zohoConfigured(), false);
});
