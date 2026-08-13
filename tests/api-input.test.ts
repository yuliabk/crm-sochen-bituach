import assert from "node:assert/strict";
import test from "node:test";
import { CLIENT_FIELDS, pickFields } from "../lib/api-input";

test("pickFields removes immutable and unknown client fields", () => {
  const result = pickFields(
    {
      full_name: "Test Client",
      agent_id: "another-agent",
      id: "replacement-id",
      unexpected: true,
    },
    CLIENT_FIELDS
  );

  assert.deepEqual(result, { full_name: "Test Client" });
});

test("pickFields rejects arrays and null", () => {
  assert.deepEqual(pickFields([], CLIENT_FIELDS), {});
  assert.deepEqual(pickFields(null, CLIENT_FIELDS), {});
});
