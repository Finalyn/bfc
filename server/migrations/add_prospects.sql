CREATE TABLE IF NOT EXISTS prospects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  enseigne VARCHAR(255) DEFAULT '',
  adresse TEXT DEFAULT '',
  code_postal VARCHAR(10) DEFAULT '',
  ville VARCHAR(255) DEFAULT '',
  tel VARCHAR(50) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  notes TEXT,
  commercial_id INT,
  commercial_name VARCHAR(255) NOT NULL,
  statut VARCHAR(50) NOT NULL DEFAULT 'nouveau',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_prospects_commercial (commercial_name),
  INDEX idx_prospects_statut (statut)
);

CREATE TABLE IF NOT EXISTS prospect_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prospect_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  date_evenement VARCHAR(10) NOT NULL,
  heure_evenement VARCHAR(5) DEFAULT '',
  rappel BOOLEAN DEFAULT FALSE,
  rappel_date VARCHAR(10),
  rappel_envoye BOOLEAN DEFAULT FALSE,
  commercial_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_prospect_events_prospect (prospect_id),
  INDEX idx_prospect_events_rappel (rappel_date)
);
