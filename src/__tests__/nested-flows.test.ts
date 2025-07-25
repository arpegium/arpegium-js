/**
 * Test suite for nested flow combinations
 * Validates that all possible combinations of parallel, sequence, and conditional flows work correctly
 */

import { Orchestrator } from '../core/orchestrator';
import { MiddlewareContext } from '../core/types';

describe('Nested Flow Combinations', () => {
  let orchestrator: Orchestrator;
  let context: MiddlewareContext;

  beforeEach(() => {
    orchestrator = new Orchestrator();
    context = {
      input: {},
      globals: {
        condition: true,
        nested_condition: true
      }
    };

    // Register test middlewares
    orchestrator.registerMiddleware('test-middleware-1', async (ctx: MiddlewareContext) => {
      ctx.globals.test1 = 'executed';
      return ctx;
    });

    orchestrator.registerMiddleware('test-middleware-2', async (ctx: MiddlewareContext) => {
      ctx.globals.test2 = 'executed';
      return ctx;
    });

    orchestrator.registerMiddleware('test-middleware-3', async (ctx: MiddlewareContext) => {
      ctx.globals.test3 = 'executed';
      return ctx;
    });

    orchestrator.registerMiddleware('test-middleware-4', async (ctx: MiddlewareContext) => {
      ctx.globals.test4 = 'executed';
      return ctx;
    });
  });

  test('Parallel -> Sequence -> Parallel combination', async () => {
    const flow = {
      name: 'test-nested-parallel-sequence-parallel',
      middlewares: [
        {
          parallel: [
            {
              sequence: [
                { type: 'test-middleware-1' },
                {
                  parallel: [
                    { type: 'test-middleware-2' },
                    { type: 'test-middleware-3' }
                  ]
                }
              ]
            },
            { type: 'test-middleware-4' }
          ]
        }
      ]
    };

    const result = await orchestrator.execute(flow, context, {});

    expect(result.globals.test1).toBe('executed');
    expect(result.globals.test2).toBe('executed');
    expect(result.globals.test3).toBe('executed');
    expect(result.globals.test4).toBe('executed');
  });

  test('Sequence -> Parallel -> Conditional combination', async () => {
    const flow = {
      name: 'test-nested-sequence-parallel-conditional',
      middlewares: [
        {
          sequence: [
            { type: 'test-middleware-1' },
            {
              parallel: [
                { type: 'test-middleware-2' },
                {
                  conditional: {
                    if: "{{condition}} === true",
                    then: [
                      { type: 'test-middleware-3' }
                    ],
                    else: [
                      { type: 'test-middleware-4' }
                    ]
                  }
                }
              ]
            }
          ]
        }
      ]
    };

    const result = await orchestrator.execute(flow, context, {});

    expect(result.globals.test1).toBe('executed');
    expect(result.globals.test2).toBe('executed');
    expect(result.globals.test3).toBe('executed');
    expect(result.globals.test4).toBeUndefined(); // Should not execute else branch
  });

  test('Conditional -> Parallel -> Sequence combination', async () => {
    // Test false condition
    const inputWithFalseCondition = { condition: false };

    const flow = {
      name: 'test-nested-conditional-parallel-sequence',
      middlewares: [
        {
          conditional: {
            if: "{{condition}} === true",
            then: [
              { type: 'test-middleware-1' }
            ],
            else: [
              {
                parallel: [
                  { type: 'test-middleware-2' },
                  {
                    sequence: [
                      { type: 'test-middleware-3' },
                      { type: 'test-middleware-4' }
                    ]
                  }
                ]
              }
            ]
          }
        }
      ]
    };

    const result = await orchestrator.execute(flow, {...context, input: inputWithFalseCondition}, {});

    expect(result.globals.test1).toBeUndefined(); // Should not execute then branch
    expect(result.globals.test2).toBe('executed');
    expect(result.globals.test3).toBe('executed');
    expect(result.globals.test4).toBe('executed');
  });

  test('Complex nested combination: Parallel -> Sequence -> Conditional -> Parallel', async () => {
    const inputWithCondition = { nested_condition: true };

    const flow = {
      name: 'test-complex-nested',
      middlewares: [
        {
          parallel: [
            {
              sequence: [
                { type: 'test-middleware-1' },
                {
                  conditional: {
                    if: "{{nested_condition}} === true",
                    then: [
                      {
                        parallel: [
                          { type: 'test-middleware-2' },
                          { type: 'test-middleware-3' }
                        ]
                      }
                    ],
                    else: [
                      { type: 'test-middleware-4' }
                    ]
                  }
                }
              ]
            },
            { type: 'test-middleware-4' }
          ]
        }
      ]
    };

    const result = await orchestrator.execute(flow, {...context, input: inputWithCondition}, {});

    expect(result.globals.test1).toBe('executed');
    expect(result.globals.test2).toBe('executed');
    expect(result.globals.test3).toBe('executed');
    expect(result.globals.test4).toBe('executed');
  });

  test('Deep nesting: 5 levels deep', async () => {
    const flow = {
      name: 'test-deep-nesting',
      middlewares: [
        {
          sequence: [
            {
              parallel: [
                {
                  conditional: {
                    if: "true",
                    then: [
                      {
                        sequence: [
                          {
                            parallel: [
                              { type: 'test-middleware-1' },
                              { type: 'test-middleware-2' }
                            ]
                          },
                          { type: 'test-middleware-3' }
                        ]
                      }
                    ]
                  }
                },
                { type: 'test-middleware-4' }
              ]
            }
          ]
        }
      ]
    };

    const result = await orchestrator.execute(flow, context, {});

    expect(result.globals.test1).toBe('executed');
    expect(result.globals.test2).toBe('executed');
    expect(result.globals.test3).toBe('executed');
    expect(result.globals.test4).toBe('executed');
  });

  test('Multiple parallel blocks in sequence', async () => {
    const flow = {
      name: 'test-multiple-parallel-in-sequence',
      middlewares: [
        {
          sequence: [
            {
              parallel: [
                { type: 'test-middleware-1' },
                { type: 'test-middleware-2' }
              ]
            },
            {
              parallel: [
                { type: 'test-middleware-3' },
                { type: 'test-middleware-4' }
              ]
            }
          ]
        }
      ]
    };

    const result = await orchestrator.execute(flow, context, {});

    expect(result.globals.test1).toBe('executed');
    expect(result.globals.test2).toBe('executed');
    expect(result.globals.test3).toBe('executed');
    expect(result.globals.test4).toBe('executed');
  });

  test('Multiple sequence blocks in parallel', async () => {
    const flow = {
      name: 'test-multiple-sequence-in-parallel',
      middlewares: [
        {
          parallel: [
            {
              sequence: [
                { type: 'test-middleware-1' },
                { type: 'test-middleware-2' }
              ]
            },
            {
              sequence: [
                { type: 'test-middleware-3' },
                { type: 'test-middleware-4' }
              ]
            }
          ]
        }
      ]
    };

    const result = await orchestrator.execute(flow, context, {});

    expect(result.globals.test1).toBe('executed');
    expect(result.globals.test2).toBe('executed');
    expect(result.globals.test3).toBe('executed');
    expect(result.globals.test4).toBe('executed');
  });
});
