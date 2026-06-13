import { NextResponse } from 'next/server';
import { GraphQLClient, gql } from 'graphql-request';

// Set up the connection to monday.com securely
const endpoint = 'https://api.monday.com/v2';
const client = new GraphQLClient(endpoint, {
  headers: {
    Authorization: process.env.MONDAY_API_KEY as string, 
    'API-Version': '2024-01', // Add this new line here
  },
});

export async function GET() {
  // Replace this with your actual Board ID (keep it as a number, no quotes)
  const boardId = 5029210752; 

 // We added items_page to fetch the actual rows (items) from the board
 // We added the 'subscribers' block at the bottom to fetch the team members
const query = gql`
  query {
    boards(ids: ${boardId}) {
      name
      columns {
        id
        title
        type
        settings_str
      }
      items_page(limit: 500) {
        items {
          id
          name
          column_values {
            id
            text
          }
        }
      }
      subscribers {
        id
        name
      }
    }
  }
`;

  try {
    const data = await client.request(query);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching monday.com data:", error);
    return NextResponse.json({ error: 'Failed to fetch board data' }, { status: 500 });
  }
}