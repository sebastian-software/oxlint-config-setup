import { waitFor } from "@testing-library/react";

async function verify() {
  await waitFor(() => {});
}

void verify();
