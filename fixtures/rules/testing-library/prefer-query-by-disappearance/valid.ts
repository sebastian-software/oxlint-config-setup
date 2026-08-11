import { screen, waitForElementToBeRemoved } from "@testing-library/react";

await waitForElementToBeRemoved(() => screen.queryByRole("alert"));
