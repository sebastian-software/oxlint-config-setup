import { fireEvent } from "@testing-library/react";

async function verify() {
  await fireEvent.click({});
}

void verify();
