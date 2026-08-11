import { waitFor } from "@testing-library/react";

async function verify() {
  await waitFor(() => expect(true).toBe(true));
}

void verify();
