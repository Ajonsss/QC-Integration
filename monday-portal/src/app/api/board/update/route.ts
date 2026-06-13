import { NextResponse } from 'next/server';
import { GraphQLClient, gql } from 'graphql-request';

// Set up the secure connection to monday.com (just like our GET route)
const endpoint = 'https://api.monday.com/v2';
const client = new GraphQLClient(endpoint, {
  headers: {
    Authorization: process.env.MONDAY_API_KEY as string,
    'API-Version': '2024-01', 
  },
});

export async function POST(request: Request) {
  try {
    // 1. Unpack the data sent from your React frontend
    const body = await request.json();
    const { itemId, columnValues } = body;

    // Replace this with your actual Board ID (keep it as a number, no quotes)
    const boardId = 5029210752; 

    // 2. Monday.com requires the column values payload to be a strict JSON string
    const columnValuesString = JSON.stringify(columnValues);

    // 3. The GraphQL Mutation to update specific columns on a specific item
    const mutation = gql`
      mutation UpdateBoardItem($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(
          board_id: $boardId,
          item_id: $itemId,
          column_values: $columnValues
        ) {
          id
        }
      }
    `;

    // 4. Inject the variables into the mutation
    const variables = {
      boardId: Number(boardId),
      itemId: Number(itemId),
      columnValues: columnValuesString,
    };

    // 5. Send the request securely to monday.com
    const data = await client.request(mutation, variables);
    
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Error updating monday.com:", error);
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }
}