import { monaco } from "@typefox/monaco-editor-react/.";

export const syntaxHighlighting: monaco.languages.IMonarchLanguage = {
  tokenizer: {
    initial: [
      { regex: /x\'[A-Fa-f0-9]+\'/, action: { token: "string" } },
      { regex: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/, action: { token: "string" } },
      { regex: /\`(\\.|\\\\|[^`\\])*\`/, action: { token: "string" } },
      {
        regex: /[_a-zA-Z][\w_]*/,
        action: {
          cases: {
            "@keywords": { token: "keyword" },
            "@default": { token: "ID" },
          },
        },
      },
      { regex: /\d+((\.\d+)?([eE][\-+]?\d+)?)?/, action: { token: "number" } },
      { include: "@whitespace" },
      {
        regex: /@symbols/,
        action: {
          cases: {
            "@operators": { token: "operator" },
            "@default": { token: "" },
          },
        },
      },
    ],
    whitespace: [
      { regex: /\s+/, action: { token: "white" } },
      { regex: /\/\*/, action: { token: "comment", next: "@comment" } },
      { regex: /\-\-[^\n\r]*/, action: { token: "comment" } },
      { regex: /\/\/[^\n\r]*/, action: { token: "comment" } },
    ],
    comment: [
      { regex: /[^\/\*]+/, action: { token: "comment" } },
      { regex: /\*\//, action: { token: "comment", next: "@pop" } },
      { regex: /[\/\*]/, action: { token: "comment" } },
    ],
  },
  keywords: [
    "ALL",
    "AND",
    "AS",
    "ASC",
    "BETWEEN",
    "BY",
    "CASCADE",
    "CAST",
    "CATALOG",
    "CONSTRAINT",
    "CREATE",
    "CURRENT",
    "DATABASE",
    "DELETE",
    "DESC",
    "DISTINCT",
    "EXCEPT",
    "FALSE",
    "FETCH",
    "FIRST",
    "FOLLOWING",
    "FOREIGN",
    "FROM",
    "FUNCTION",
    "GROUP",
    "HAVING",
    "IN",
    "INDEX",
    "INTERSECT",
    "IS",
    "JOIN",
    "KEY",
    "LEFT",
    "LIKE",
    "LIMIT",
    "MINUS",
    "NEXT",
    "NOT",
    "NULL",
    "OFFSET",
    "ON",
    "ONLY",
    "OR",
    "ORDER",
    "OVER",
    "PARTITION",
    "PERCENT",
    "PRECEDING",
    "PRIMARY",
    "RANGE",
    "RECURSIVE",
    "REFERENCES",
    "REPLACE",
    "RIGHT",
    "ROW",
    "ROWS",
    "SCHEMA",
    "SELECT",
    "TABLE",
    "TIES",
    "TOP",
    "TRUE",
    "UNBOUNDED",
    "UNION",
    "UNIQUE",
    "USING",
    "WHERE",
    "WITH",
  ],
  symbols: /%|\(|\)|\*|\+|,|\-|\.|\/|::|::\$|::%|;|<|<=|<>|=|>|>=|\|\|/,

  operators: [
    "%",
    "*",
    "+",
    ",",
    "-",
    ".",
    "/",
    "::",
    "::$",
    "::%",
    ";",
    "<",
    "<=",
    "<>",
    "=",
    ">",
    ">=",
    "||",
  ],
};

export const defaultText = `SELECT * FROM airplane a;

--
-- Database schemes
--
CREATE TABLE airline (
  airline_id INT NOT NULL,
  iata CHAR NOT NULL,
  airlinename CHAR,
  base_airport INT NOT NULL,
  PRIMARY KEY (airline_id),
  UNIQUE KEY iata_unq (iata),
  KEY heimat_idx (base_airport),
  CONSTRAINT fluglinie_ibfk_1 FOREIGN KEY (base_airport) REFERENCES airport (airport_id)
);

CREATE TABLE airplane (
  airplane_id INT NOT NULL,
  capacity INT NOT NULL,
  type_id INT NOT NULL,
  airline_id INT NOT NULL,
  PRIMARY KEY (airplane_id)
);

CREATE TABLE airplane_type (
  type_id INT NOT NULL,
  identifier CHAR,
  description CHAR,
  PRIMARY KEY (type_id)
);

CREATE TABLE airport (
  airport_id INT NOT NULL,
  iata CHAR,
  icao CHAR NOT NULL,
  name CHAR NOT NULL,
  PRIMARY KEY (airport_id),
  UNIQUE KEY icao_unq (icao),
  KEY name_idx (name),
  KEY iata_idx (iata)
);

CREATE TABLE airport_geo (
  airport_id INT NOT NULL,
  name CHAR NOT NULL,
  city CHAR,
  country CHAR,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  KEY flughafen_idx (airport_id)
);

CREATE TABLE airport_reachable (
  airport_id INT NOT NULL,
  hops INT,
  PRIMARY KEY (airport_id)
);

CREATE TABLE booking (
  booking_id INT NOT NULL,
  flight_id INT NOT NULL,
  seat CHAR,
  passenger_id INT NOT NULL,
  price REAL NOT NULL,
  PRIMARY KEY (booking_id),
  UNIQUE KEY sitzplan_unq (flight_id,seat),
  KEY flug_idx (flight_id),
  KEY passagier_idx (passenger_id),
  CONSTRAINT buchung_ibfk_1 FOREIGN KEY (flight_id) REFERENCES flight (flight_id),
  CONSTRAINT buchung_ibfk_2 FOREIGN KEY (passenger_id) REFERENCES passenger (passenger_id)
);

CREATE TABLE employee (
  employee_id INT NOT NULL,
  firstname CHAR NOT NULL,
  lastname CHAR NOT NULL,
  birthdate DATETIME NOT NULL,
  sex CHAR,
  street CHAR NOT NULL,
  city CHAR NOT NULL,
  zip INT NOT NULL,
  country CHAR NOT NULL,
  emailaddress CHAR,
  telephoneno CHAR,
  salary REAL,
  --department ENUM('Marketing','Buchhaltung','Management','Logistik','Flugfeld'),
  username CHAR,
  password CHAR,
  PRIMARY KEY (employee_id),
  UNIQUE KEY benutzer_unq (username)
);

CREATE TABLE flight (
  flight_id INT NOT NULL,
  flightno CHAR NOT NULL,
  source INT NOT NULL,
  destination INT NOT NULL,
  departure DATETIME NOT NULL,
  arrival DATETIME NOT NULL,
  airline_id INT NOT NULL,
  airplane_id INT NOT NULL,
  PRIMARY KEY (flight_id),
  KEY von_idx (source),
  KEY nach_idx (destination),
  KEY abflug_idx (departure),
  KEY ankunft_idx (arrival),
  KEY fluglinie_idx (airline_id),
  KEY flugzeug_idx (airplane_id),
  CONSTRAINT flug_ibfk_1 FOREIGN KEY (source) REFERENCES airport (airport_id),
  CONSTRAINT flug_ibfk_2 FOREIGN KEY (destination) REFERENCES airport (airport_id),
  CONSTRAINT flug_ibfk_3 FOREIGN KEY (airline_id) REFERENCES airline (airline_id),
  CONSTRAINT flug_ibfk_4 FOREIGN KEY (airplane_id) REFERENCES airplane (airplane_id)
);

CREATE TABLE flight_log (
  log_date DATETIME NOT NULL,
  user CHAR NOT NULL,
  flight_id INT NOT NULL,
  flightno_old CHAR NOT NULL,
  flightno_new CHAR NOT NULL,
  from_old INT NOT NULL,
  to_old INT NOT NULL,
  from_new INT NOT NULL,
  to_new INT NOT NULL,
  departure_old DATETIME NOT NULL,
  arrival_old DATETIME NOT NULL,
  departure_new DATETIME NOT NULL,
  arrival_new DATETIME NOT NULL,
  airplane_id_old INT NOT NULL,
  airplane_id_new INT NOT NULL,
  airline_id_old INT NOT NULL,
  airline_id_new INT NOT NULL,
  comment CHAR
);

CREATE TABLE flightschedule (
  flightno CHAR NOT NULL,
  source INT NOT NULL,
  destination INT NOT NULL,
  departure DATETIME NOT NULL,
  arrival DATETIME NOT NULL,
  airline_id INT NOT NULL,
  monday INT,
  tuesday INT,
  wednesday INT,
  thursday INT,
  friday INT,
  saturday INT,
  sunday INT,
  PRIMARY KEY (flightno),
  KEY von_idx (source),
  KEY nach_idx (destination),
  KEY fluglinie_idx (airline_id),
  CONSTRAINT flugplan_ibfk_1 FOREIGN KEY (source) REFERENCES airport (airport_id),
  CONSTRAINT flugplan_ibfk_2 FOREIGN KEY (destination) REFERENCES airport (airport_id),
  CONSTRAINT flugplan_ibfk_3 FOREIGN KEY (airline_id) REFERENCES airline (airline_id)
);

CREATE TABLE passenger (
  passenger_id INT NOT NULL,
  passportno CHAR NOT NULL,
  firstname CHAR NOT NULL,
  lastname CHAR NOT NULL,
  PRIMARY KEY (passenger_id),
  UNIQUE KEY pass_unq (passportno)
);

CREATE TABLE passengerdetails (
  passenger_id INT NOT NULL,
  birthdate DATETIME NOT NULL,
  sex CHAR,
  street CHAR NOT NULL,
  city CHAR NOT NULL,
  zip INT NOT NULL,
  country CHAR NOT NULL,
  emailaddress CHAR,
  telephoneno CHAR,
  PRIMARY KEY (passenger_id),
  CONSTRAINT passagierdetails_ibfk_1 FOREIGN KEY (passenger_id) REFERENCES passenger (passenger_id) ON DELETE CASCADE
);

CREATE TABLE weatherdata (
  log_date DATETIME NOT NULL,
  time DATETIME NOT NULL,
  station INT NOT NULL,
  temp REAL NOT NULL,
  humidity REAL NOT NULL,
  airpressure REAL NOT NULL,
  wind REAL NOT NULL,
  --weather enum('Nebel-Schneefall','Schneefall','Regen','Regen-Schneefall','Nebel-Regen','Nebel-Regen-Gewitter','Gewitter','Nebel','Regen-Gewitter'),
  winddirection INT NOT NULL,
  PRIMARY KEY (log_date,time,station)
);

-- The Flughafen DB by Stefan Proell, Eva Zangerle, Wolfgang Gassler 
-- is located under https://github.com/stefanproell/flughafendb
-- and is licensed under CC BY 4.0. To view a copy of this license, 
-- visit https://creativecommons.org/licenses/by/4.0
`;
