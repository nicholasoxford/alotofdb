-- Migration number: 0005 	 2024-01-20T15:43:26.261Z
CREATE TABLE analyticSummaryReports (
    readQueries INT,
    writeQueries INT,
    rowsRead INT,
    rowsWritten INT,
    startingDate DATE,
    endingDate DATE,
    databaseId VARCHAR(255),
    numberOfDatabases INT,
    user_id INTEGER NOT NULL
);