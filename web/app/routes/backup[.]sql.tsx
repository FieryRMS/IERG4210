import { logHoneypot } from "@/lib/honeypot.server";

const FAKE_DUMP = `-- MySQL dump 10.13  Distrib 8.0.36, for Linux (x86_64)
--
-- Host: localhost    Database: customer_prod_db
-- ------------------------------------------------------
-- Server version\t8.0.36

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8mb4 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;

--
-- Table structure for table \`users\`
--

DROP TABLE IF EXISTS \`users\`;
CREATE TABLE \`users\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`email\` varchar(255) NOT NULL,
  \`password_hash\` varchar(255) NOT NULL,
  \`role\` enum('admin','user') NOT NULL DEFAULT 'user',
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`email\` (\`email\`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table \`users\`
--

INSERT INTO \`users\` VALUES
(1,'admin@ierg4210.com','$2b$12$7pQV3kLmN8xWyZaB1cD2eO5fG9hI4jK6lM0nP3qR7sT1uV5wX8yA','admin','2024-09-01 08:00:00'),
(2,'alice@example.com','$2b$12$aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8gH9i','user','2024-09-15 10:23:41'),
(3,'bob@example.com','$2b$12$xY9wV8uT7sR6qP5oN4mL3kJ2iH1gF0eD9cB8aZ7yX6wV5uT4sR3q','user','2024-10-02 14:05:17');

--
-- Table structure for table \`orders\`
--

DROP TABLE IF EXISTS \`orders\`;
CREATE TABLE \`orders\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`user_id\` int NOT NULL,
  \`total\` decimal(10,2) NOT NULL,
  \`status\` enum('pending','paid','shipped','cancelled') NOT NULL DEFAULT 'pending',
  \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`user_id\` (\`user_id\`),
  CONSTRAINT \`orders_ibfk_1\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
) ENGINE=InnoDB AUTO_INCREMENT=157 DEFAULT CHARSET=utf8mb4;

/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
-- Dump completed on 2026-05-09  3:14:07
`;

export function loader({ request }: { request: Request }) {
    logHoneypot(request, "backup-sql");
    return new Response(FAKE_DUMP, {
        headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": 'attachment; filename="backup.sql"',
        },
    });
}
