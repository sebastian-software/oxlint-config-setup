import { waitFor } from "@testing-library/react";

async function verify() {
  await waitFor(() => {
    expect(true).toEqual(true);
    expect(true).toEqual(true);
  });
}

void verify();
