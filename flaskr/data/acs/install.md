download 7zip: https://www.7-zip.org/ (your computer will NOT unzip large files)
download the acs summary file: https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/5YRData.zip
use 7zip to extract the inner "data" folder from 5YRData.zip into this directory
in your IDE or file explorer use ctrl+x (NOT CONTROL C - that will make your computer sad) on all the .dat files
create an acs/raw/ folder and paste the dat files in (this will take a minute)
delete any empty leftover directories

your folder tree should look like this:

flaskr/
└── data/
    └── acs/
        ├── install.md
        ├── .gitkeep
        └── raw/
            ├── xxx.dat
            ├── xxx.dat
            └── xxx.dat