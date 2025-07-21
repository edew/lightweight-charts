/**
 * This type should be used when you need to save result of the setTimeout/setInterval functions.
 * It makes the compilation with non-composite project happy.
 */
type TimerId = ReturnType<typeof setTimeout>;
