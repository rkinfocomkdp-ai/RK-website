<?php
/**
 * Database Helper - Initializes PDO Connection
 */

require_once __DIR__ . '/config.php';

/**
 * Returns a shared instance of the PDO database connection.
 * 
 * @return PDO
 * @throws PDOException
 */
function getDbConnection() {
    static $pdo = null;
    
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        ];
        
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Throw a clean exception instead of leaking password details in default output
            throw new Exception("Database connection failed. Verify MySQL service is running and credentials are correct. Error: " . $e->getMessage());
        }
    }
    
    return $pdo;
}
