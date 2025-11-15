### Create vitual environment for Python
```shell
python -m venv .venv
source .venv/bin/activate
```


### Run Backend
1. Go to Backend directory
2. Install python dependencies as:
```shell
    pip install -r requirement.txt
```
3. Run flask Application
```shell
   command to run flask application
```

### Run Frontend Application
1. Go to Frontend directory
2. Install NPM packages
```shell
   npm install
```
3. Run Frontend Application
```shell
   npm run dev
```

### Run Background Job to seed data to Mistral
Background job will fetch data from reddit and insert data into the Qdrant database.
1. Install Dependencies
```shell
pip install data/requirement.txt
```
2. Run the main.py to insert data
```shell
python main.py
```