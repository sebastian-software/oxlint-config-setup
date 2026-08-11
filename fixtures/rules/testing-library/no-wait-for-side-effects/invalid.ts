import { fireEvent, waitFor } from "@testing-library/react";

async function verify() {
  await waitFor(() => {
    fireEvent.click({});
  });
}

void verify();
